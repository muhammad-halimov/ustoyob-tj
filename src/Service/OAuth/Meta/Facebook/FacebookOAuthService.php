<?php

namespace App\Service\OAuth\Meta\Facebook;

use App\Entity\User;
use App\Entity\User\OAuthType;
use App\Repository\UserRepository;
use App\Service\OAuth\StateStorage;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Сервис для работы с Facebook OAuth 2.0
 *
 * Обеспечивает полный цикл авторизации через Facebook:
 * - Генерация URL для редиректа
 * - Обмен authorization code на токены
 * - Создание/обновление пользователей в системе
 */
readonly class FacebookOAuthService
{
    public function __construct(
        private HttpClientInterface      $httpClient,
        private StateStorage             $stateStorage,
        private UserRepository           $userRepository,
        private EntityManagerInterface   $entityManager,
        private JWTTokenManagerInterface $jwtManager,
    ) {}

    /**
     * Генерирует URL для редиректа пользователя на страницу авторизации Facebook
     *
     * Создает случайный state для защиты от CSRF атак и сохраняет его в кеше.
     * State проверяется при обработке callback от Facebook.
     *
     * @return string URL для редиректа
     * @throws RandomException Если не удалось сгенерировать случайные байты
     * @throws InvalidArgumentException Если не удалось сохранить state в кеш
     */
    public function generateFacebookOAuthRedirectUri(): string
    {
        // Генерируем случайный state (32 символа hex) для защиты от CSRF
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->add($randomState);

        $scope = [
            'email',
            'user_birthday',
            'user_link',
            'user_age_range',
            'user_gender',
            'public_profile'
        ];

        $queryParams = [
            'client_id' => $_ENV['OUATH_FACEBOOK_CLIENT_ID'],
            'redirect_uri' => $_ENV['FACEBOOK_REDIRECT_URI'],
            'response_type' => 'code', // Authorization Code Flow
            'scope' => implode(',', $scope),
            'state' => $randomState,
        ];

        return $_ENV['FACEBOOK_AUTH_URI'] . '?' . http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Обрабатывает authorization code от Facebook и создает/обновляет пользователя
     *
     * Основной процесс:
     * 1. Проверка state (защита от CSRF)
     * 2. Обмен code на токены (id_token и access_token)
     * 3. Поиск/создание пользователя в БД
     * 4. Генерация JWT токена для нашей системы
     *
     * @param string $code Authorization code от Facebook
     * @param string $state State для проверки CSRF
     * @param string|null $role Роль пользователя (master/client), если это новый пользователь
     * @return array ['user' => User, 'token' => string] Пользователь и JWT токен
     * @throws BadRequestHttpException Если state невалиден или Facebook вернул ошибку
     * @throws ClientExceptionInterface|DecodingExceptionInterface|RedirectionExceptionInterface
     * @throws ServerExceptionInterface|TransportExceptionInterface|InvalidArgumentException
     */
    public function handleCode(string $code, string $state, ?string $role): array
    {
        // Проверяем state для защиты от CSRF атак
        if (!$this->stateStorage->has($state)) {
            throw new BadRequestHttpException('Invalid state');
        }

        $this->stateStorage->remove($state);

        // Обмениваем authorization code на токены
        try {
            $data = $this->httpClient->request('GET', $_ENV['FACEBOOK_TOKEN_URI'], [
                'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
                'query' => [
                    'client_id' => $_ENV['OUATH_FACEBOOK_CLIENT_ID'],
                    'client_secret' => $_ENV['OUATH_FACEBOOK_CLIENT_SECRET'],
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => $_ENV['FACEBOOK_REDIRECT_URI'],
                    'code' => $code,
                ],
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException('Failed to exchange code with Meta. The code may be expired or invalid.', code: $e->getCode());
        }

        // Находим существующего пользователя или создаем нового
        $user = $this->findOrCreateUser($this->fetchFacebookUser($data['access_token']), $role);

        return ['user' => $user, 'token' => $this->jwtManager->create($user)];
    }

    /**
     * Получает данные от Meta с помощью access_token
     *
     * Основной процесс:
     * 1. Передача основного scope/fields
     * 2. Обмен токена на данные пользователя (access_token)
     * 3. Возвращения объекта пользователя как массива
     *
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     */
    private function fetchFacebookUser(string $accessToken): array
    {
        $fields = [
            'id',
            'name',
            'email',
            'picture',
            'birthday',
            'link',
            'age_range',
            'gender'
        ];

        // Обмениваем токен на данные пользователя
        try {
            return $this->httpClient->request('GET', $_ENV['FACEBOOK_GRAPH_URI'], [
                'query' => [
                    'fields' => implode(',', $fields),
                    'access_token' => $accessToken
                ],
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException('Failed to exchange token with Meta. The token may be expired or invalid.', code: $e->getCode());
        }
    }

    /**
     * Находит существующего пользователя или создает нового
     *
     * Логика поиска (в порядке приоритета):
     * 1. По Facebook ID - пользователь уже авторизовывался через Facebook
     * 2. По email - пользователь регистрировался через форму
     * 3. Создание нового - первый вход через Facebook
     *
     * При обновлении существующего пользователя:
     * - Обновляем данные из Facebook (имя, фото)
     * - Привязываем Facebook OAuth если его не было
     *
     * @param array $facebookData Данные пользователя от Facebook
     * @param string|null $role Роль для нового пользователя (master/client)
     * @return User Найденный или созданный пользователь
     * @throws BadRequestHttpException Если email уже привязан к другому Facebook аккаунту
     */
    private function findOrCreateUser(array $facebookData, ?string $role): User
    {
        $facebookId = $facebookData['id']; // Уникальный ID пользователя в Facebook
        $email = $facebookData['email'] ?? '';

        // 1. Поиск по Facebook ID - пользователь уже заходил через Facebook
        if ($user = $this->userRepository->findByFacebookId($facebookId)) {
            $this->updateUserFromFacebookData($user, $facebookData);
            $this->entityManager->flush();
            return $user;
        }

        // 2. Поиск по email - возможно пользователь регистрировался через форму
        if ($existingUser = $this->userRepository->findOneBy(['email' => $email])) {
            // Проверяем, не привязан ли email к другому Facebook аккаунту
            if ($existingUser->getOauthType() !== null) {
                throw new BadRequestHttpException('This email is already associated with another Meta account.');
            }

            // Привязываем Facebook OAuth к существующему пользователю
            $oauth = new OAuthType();
            $oauth->setFacebookId($facebookId);
            $existingUser->setOauthType($oauth);
            $this->updateUserFromFacebookData($existingUser, $facebookData);
            $this->entityManager->persist($oauth);
            $this->entityManager->flush();
            return $existingUser;
        }

        // 3. Создание нового пользователя - первый вход через Facebook
        $oauth = new OAuthType();
        $oauth->setFacebookId($facebookId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setEmail($facebookData['email'] ?? '')
            ->setName(explode(' ', $facebookData['name'], 2)[0] ?? '')
            ->setSurname(explode(' ', $facebookData['name'], 2)[1] ?? '')
            ->setImageExternalUrl($facebookData['picture']['data']['url'] ?? '')
            ->setPassword('') // OAuth пользователи не имеют пароля
            ->setActive(true)
            ->setApproved(true)
            ->setBio($facebookData['link'] ?? null)
            ->setGender(match($facebookData['gender'] ?? null) {
                'male' => 'gender_male',
                'female' => 'gender_female',
                default => 'gender_neutral'
            })
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default => []
            });

        // Парсинг даты рождения из формата MM/DD/YYYY
        if (isset($facebookData['birthday'])) {
            try {
                $birthday = DateTime::createFromFormat('m/d/Y', $facebookData['birthday']);
                if ($birthday !== false) {
                    $user->setDateOfBirth($birthday);
                }
            } catch (Exception) {
                // Игнорируем ошибку парсинга даты
            }
        }

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Обновляет данные существующего пользователя из Facebook
     *
     * @param User $user Пользователь для обновления
     * @param array $facebookData Данные от Facebook
     */
    private function updateUserFromFacebookData(User $user, array $facebookData): void
    {
        if (isset($facebookData['name'])) {
            $nameParts = explode(' ', $facebookData['name'], 2);
            $user->setName($nameParts[0] ?? '');
            $user->setSurname($nameParts[1] ?? '');
        }

        if (isset($facebookData['picture']['data']['url'])) {
            $user->setImageExternalUrl($facebookData['picture']['data']['url']);
        }

        if (isset($facebookData['birthday'])) {
            try {
                $birthday = DateTime::createFromFormat('m/d/Y', $facebookData['birthday']);
                if ($birthday !== false) {
                    $user->setDateOfBirth($birthday);
                }
            } catch (Exception) {
                // Игнорируем ошибку парсинга даты
            }
        }
    }
}
