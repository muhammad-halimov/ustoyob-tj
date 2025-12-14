<?php

namespace App\Service\OAuth\Meta\Instagram;

use App\Entity\User;
use App\Entity\User\OAuthType;
use App\Repository\UserRepository;
use App\Service\OAuth\StateStorage;
use Doctrine\ORM\EntityManagerInterface;
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
 * Сервис для работы с Instagram OAuth 2.0
 *
 * Обеспечивает полный цикл авторизации через Instagram:
 * - Генерация URL для редиректа
 * - Обмен authorization code на токены
 * - Создание/обновление пользователей в системе
 */
readonly class InstagramOAuthService
{
    public function __construct(
        private HttpClientInterface      $httpClient,
        private StateStorage             $stateStorage,
        private UserRepository           $userRepository,
        private EntityManagerInterface   $entityManager,
        private JWTTokenManagerInterface $jwtManager,
    ) {}

    /**
     * Генерирует URL для редиректа пользователя на страницу авторизации Instagram
     *
     * Создает случайный state для защиты от CSRF атак и сохраняет его в кеше.
     * State проверяется при обработке callback от Instagram.
     *
     * @return string URL для редиректа
     * @throws RandomException Если не удалось сгенерировать случайные байты
     * @throws InvalidArgumentException Если не удалось сохранить state в кеш
     */
    public function generateInstagramOAuthRedirectUri(): string
    {
        // Генерируем случайный state (32 символа hex) для защиты от CSRF
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->add($randomState);

        $queryParams = [
            'force_reauth' => true,
            'client_id' => $_ENV['OUATH_INSTAGRAM_CLIENT_ID'],
            'redirect_uri' => $_ENV['INSTAGRAM_REDIRECT_URI'],
            'response_type' => 'code', // Authorization Code Flow
            'scope' => 'instagram_business_basic',
            'state' => $randomState,
        ];

        return $_ENV['INSTAGRAM_AUTH_URI'] . '?' . http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Обрабатывает authorization code от Instagram и создает/обновляет пользователя
     *
     * Основной процесс:
     * 1. Проверка state (защита от CSRF)
     * 2. Обмен code на токены (id_token и access_token)
     * 3. Поиск/создание пользователя в БД
     * 4. Генерация JWT токена для нашей системы
     *
     * @param string $code Authorization code от Instagram
     * @param string $state State для проверки CSRF
     * @param string|null $role Роль пользователя (master/client), если это новый пользователь
     * @return array ['user' => User, 'token' => string] Пользователь и JWT токен
     * @throws BadRequestHttpException Если state невалиден или Instagram вернул ошибку
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
            $data = $this->httpClient->request('POST', $_ENV['INSTAGRAM_TOKEN_URI'], [
                'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
                'body' => http_build_query([
                    'client_id' => $_ENV['OUATH_INSTAGRAM_CLIENT_ID'],
                    'client_secret' => $_ENV['OUATH_INSTAGRAM_CLIENT_SECRET'],
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => $_ENV['INSTAGRAM_REDIRECT_URI'],
                    'code' => $code,
                ]),
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException('Failed to exchange code with Meta. The code may be expired or invalid.', code: $e->getCode());
        }

        // Находим существующего пользователя или создаем нового
        $user = $this->findOrCreateUser($this->fetchInstagramUser($data['access_token']), $role);

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
    private function fetchInstagramUser(string $accessToken): array
    {
        $fields = [
            'id',
            'username',
            'name',
            'profile_picture_url',
            'biography'
        ];

        // Обмениваем токен на данные пользователя
        try {
            return $this->httpClient->request('GET', $_ENV['INSTAGRAM_GRAPH_URI'], [
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
     * 1. По Instagram ID - пользователь уже авторизовывался через Instagram
     * 2. Создание нового - первый вход через Instagram
     *
     * При обновлении существующего пользователя:
     * - Обновляем данные из Instagram (имя, фото)
     * - Привязываем Instagram OAuth если его не было
     *
     * @param array $instagramData Данные пользователя от Instagram
     * @param string|null $role Роль для нового пользователя (master/client)
     * @return User Найденный или созданный пользователь
     * @throws BadRequestHttpException Если email не подтвержден или уже привязан к другому Instagram аккаунту
     */
    private function findOrCreateUser(array $instagramData, ?string $role): User
    {
        $instagramId = $instagramData['id']; // Уникальный ID пользователя в Instagram

        // 1. Поиск по Instagram ID - пользователь уже заходил через Instagram
        if ($user = $this->userRepository->findByInstagramId($instagramId)) {
            $this->updateUserFromInstagramData($user, $instagramData);
            $this->entityManager->flush();
            return $user;
        }

        // 3. Создание нового пользователя - первый вход через Instagram
        $oauth = new OAuthType();
        $oauth->setInstagramId($instagramId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setUsername($instagramData['username'])
            ->setName(explode(' ', $instagramData['name'], 2)[0] ?? '')
            ->setSurname(explode(' ', $instagramData['name'], 2)[1] ?? '')
            ->setImageExternalUrl($instagramData['profile_picture_url'] ?? '')
            ->setPassword('') // OAuth пользователи не имеют пароля
            ->setActive(true)
            ->setApproved(true)
            ->setBio($instagramData['biography'])
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default => []
            });

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Обновляет данные существующего пользователя из Instagram
     *
     * @param User $user Пользователь для обновления
     * @param array $instagramData Данные от Instagram
     */
    private function updateUserFromInstagramData(User $user, array $instagramData): void
    {
        if (isset($instagramData['username'])) {
            $user->setUsername($instagramData['username']);
        }
        if (isset($instagramData['name'])) {
            $user->setName(explode(' ', $instagramData['name'], 2)[0]);
            $user->setSurname(explode(' ', $instagramData['name'], 2)[1]);
        }
        if (isset($instagramData['profile_picture_url'])) {
            $user->setImageExternalUrl($instagramData['profile_picture_url']);
        }
        if (isset($instagramData['biography'])) {
            $user->setBio($instagramData['biography']);
        }
    }
}
