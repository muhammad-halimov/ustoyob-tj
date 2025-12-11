<?php

namespace App\Service\OAuth\Google;

use App\Entity\User;
use App\Entity\User\OAuthType;
use App\Repository\UserRepository;
use App\Service\OAuth\StateStorage;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
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
 * Сервис для работы с Google OAuth 2.0
 *
 * Обеспечивает полный цикл авторизации через Google:
 * - Генерация URL для редиректа
 * - Обмен authorization code на токены
 * - Верификация ID token
 * - Получение дополнительных данных пользователя (телефон, пол, дата рождения)
 * - Создание/обновление пользователей в системе
 */
class GoogleOAuthService
{
    /**
     * Кеш публичных ключей Google для верификации JWT
     * Грузит один раз при первом запросе
     */
    private ?array $googlePublicKeys = null;

    public function __construct(
        private readonly HttpClientInterface      $httpClient,
        private readonly StateStorage             $stateStorage,
        private readonly UserRepository           $userRepository,
        private readonly EntityManagerInterface   $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
    ) {}

    /**
     * Генерирует URL для редиректа пользователя на страницу авторизации Google
     *
     * Создает случайный state для защиты от CSRF атак и сохраняет его в кеше.
     * State проверяется при обработке callback от Google.
     *
     * @return string URL для редиректа
     * @throws RandomException Если не удалось сгенерировать случайные байты
     * @throws InvalidArgumentException Если не удалось сохранить state в кеш
     */
    public function generateGoogleOAuthRedirectUri(): string
    {
        // Генерируем случайный state (32 символа hex) для защиты от CSRF
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->add($randomState);

        $scopes = [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/user.phonenumbers.read',
            'https://www.googleapis.com/auth/user.gender.read',
            'https://www.googleapis.com/auth/user.birthday.read',
        ];

        $queryParams = [
            'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
            'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
            'response_type' => 'code', // Authorization Code Flow
            'scope' => implode(' ', $scopes),
            'access_type' => 'offline', // Для получения refresh token
            'state' => $randomState,
        ];

        return $_ENV['GOOGLE_AUTH_URI'] . '?' . http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Обрабатывает authorization code от Google и создает/обновляет пользователя
     *
     * Основной процесс:
     * 1. Проверка state (защита от CSRF)
     * 2. Обмен code на токены (id_token и access_token)
     * 3. Верификация id_token и извлечение базовых данных
     * 4. Получение дополнительных данных через People API (телефон, пол, дата рождения)
     * 5. Поиск/создание пользователя в БД
     * 6. Генерация JWT токена для нашей системы
     *
     * @param string $code Authorization code от Google
     * @param string $state State для проверки CSRF
     * @param string|null $role Роль пользователя (master/client), если это новый пользователь
     * @return array ['user' => User, 'token' => string] Пользователь и JWT токен
     * @throws BadRequestHttpException Если state невалиден или Google вернул ошибку
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
            $data = $this->httpClient->request('POST', $_ENV['GOOGLE_TOKEN_URI'], [
                'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
                'body' => http_build_query([
                    'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
                    'client_secret' => $_ENV['OAUTH_GOOGLE_CLIENT_SECRET'],
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
                    'code' => $code,
                ]),
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException('Failed to exchange code with Google. The code may be expired or invalid.', code: $e->getCode());
        }

        if (!isset($data['id_token'])) {
            throw new BadRequestHttpException('No id_token received from Google');
        }

        // Верифицируем ID token и получаем базовые данные пользователя
        $userData = $this->verifyIdToken($data['id_token']);

        // Получаем дополнительные данные (телефон, пол, дата рождения) через People API
        if (isset($data['access_token'])) {
            $userData = array_merge($userData, $this->fetchAdditionalUserDetails($data['access_token']));
        }

        // Находим существующего пользователя или создаем нового
        $user = $this->findOrCreateUser($userData, $role);

        return ['user' => $user, 'token' => $this->jwtManager->create($user)];
    }

    /**
     * Верифицирует Google ID Token и извлекает данные пользователя
     *
     * ID Token содержит базовую информацию: email, имя, фото.
     * Используется JWT с подписью Google для безопасной передачи данных.
     *
     * Процесс верификации:
     * 1. Загрузка публичных ключей Google (кешируются)
     * 2. Проверка подписи JWT
     * 3. Проверка audience (наш client_id)
     * 4. Проверка issuer (accounts.google.com)
     * 5. Проверка срока действия
     *
     * @param string $idToken JWT токен от Google
     * @return array Данные пользователя из токена
     * @throws BadRequestHttpException Если токен невалиден
     * @throws TransportExceptionInterface|ClientExceptionInterface|DecodingExceptionInterface
     * @throws RedirectionExceptionInterface|ServerExceptionInterface
     */
    private function verifyIdToken(string $idToken): array
    {
        // Загружаем публичные ключи Google для проверки подписи (кешируем)
        if ($this->googlePublicKeys === null) {
            $this->googlePublicKeys = $this->httpClient->request('GET', $_ENV['GOOGLE_CERTS_URI'])->toArray();
        }

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($this->googlePublicKeys));
        } catch (Exception $e) {
            throw new BadRequestHttpException('Invalid ID token: ' . $e->getMessage());
        }

        // Проверяем, что токен выдан для нашего приложения
        if ($decoded->aud !== $_ENV['OAUTH_GOOGLE_CLIENT_ID']) {
            throw new BadRequestHttpException('Invalid token audience');
        }

        // Проверяем, что токен выдан Google
        if (!in_array($decoded->iss, [$_ENV['GOOGLE_ACCOUNT_URI'], 'accounts.google.com'])) {
            throw new BadRequestHttpException('Invalid token issuer');
        }

        // Проверяем срок действия токена
        if ($decoded->exp < time()) {
            throw new BadRequestHttpException('Token has expired');
        }

        return (array)$decoded;
    }

    /**
     * Получает дополнительные данные пользователя через Google People API
     *
     * ID Token содержит только базовую информацию (email, имя, фото).
     * Для получения телефона, пола и даты рождения нужен отдельный запрос к People API.
     *
     * Важно: не все пользователи указывают эти данные в Google аккаунте,
     * поэтому возвращаем null если данных нет.
     *
     * @param string $accessToken OAuth 2.0 access token для запроса к API
     * @return array ['phone' => ?string, 'gender' => ?string, 'birthdate' => ?string]
     * @throws ClientExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws ServerExceptionInterface
     * @throws TransportExceptionInterface
     */
    private function fetchAdditionalUserDetails(string $accessToken): array
    {
        try {
            $data = $this->httpClient->request('GET', $_ENV['GOOGLE_ACCOUNT_ADDITIONAL_INFO_URI'], [
                'headers' => ['Authorization' => "Bearer $accessToken"],
                'query' => ['personFields' => 'phoneNumbers,genders,birthdays']
            ])->toArray();

            // Извлекаем дату рождения из массива birthdays
            $birthdate = null;
            foreach ($data['birthdays'] ?? [] as $birthday) {
                $date = $birthday['date'] ?? null;
                if ($date && isset($date['year'], $date['month'], $date['day'])) {
                    $birthdate = sprintf('%04d-%02d-%02d', $date['year'], $date['month'], $date['day']);
                    break;
                }
            }

            return [
                'phone' => $data['phoneNumbers'][0]['value'] ?? null,
                'gender' => $data['genders'][0]['value'] ?? null,
                'birthdate' => $birthdate,
            ];
        } catch (Exception) {
            // Если не удалось получить дополнительные данные - не критично
            return ['phone' => null, 'gender' => null, 'birthdate' => null];
        }
    }

    /**
     * Находит существующего пользователя или создает нового
     *
     * Логика поиска (в порядке приоритета):
     * 1. По Google ID - пользователь уже авторизовывался через Google
     * 2. По email - пользователь мог регистрироваться через форму
     * 3. Создание нового - первый вход через Google
     *
     * При обновлении существующего пользователя:
     * - Обновляем данные из Google (имя, фото, телефон, пол, дата рождения)
     * - Привязываем Google OAuth если его не было
     *
     * @param array $googleData Данные пользователя от Google
     * @param string|null $role Роль для нового пользователя (master/client)
     * @return User Найденный или созданный пользователь
     * @throws BadRequestHttpException Если email не подтвержден или уже привязан к другому Google аккаунту
     */
    private function findOrCreateUser(array $googleData, ?string $role): User
    {
        // Google требует подтверждения email
        if (!($googleData['email_verified'] ?? false)) {
            throw new BadRequestHttpException('Unverified by Google');
        }

        $googleId = $googleData['sub']; // Уникальный ID пользователя в Google
        $email = $googleData['email'] ?? '';

        // 1. Поиск по Google ID - пользователь уже заходил через Google
        if ($user = $this->userRepository->findByGoogleId($googleId)) {
            $this->updateUserFromGoogleData($user, $googleData);
            $this->entityManager->flush();
            return $user;
        }

        // 2. Поиск по email - возможно пользователь регистрировался через форму
        if ($existingUser = $this->userRepository->findOneBy(['email' => $email])) {
            // Проверяем, не привязан ли email к другому Google аккаунту
            if ($existingUser->getOauthType() !== null) {
                throw new BadRequestHttpException('This email is already associated with another Google account.');
            }

            // Привязываем Google OAuth к существующему пользователю
            $oauth = new OAuthType();
            $oauth->setGoogleId($googleId);
            $existingUser->setOauthType($oauth);
            $this->updateUserFromGoogleData($existingUser, $googleData);
            $this->entityManager->persist($oauth);
            $this->entityManager->flush();
            return $existingUser;
        }

        // 3. Создание нового пользователя - первый вход через Google
        $oauth = new OAuthType();
        $oauth->setGoogleId($googleId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setEmail($email)
            ->setName($googleData['given_name'] ?? '')
            ->setSurname($googleData['family_name'] ?? '')
            ->setImageExternalUrl($googleData['picture'] ?? '')
            ->setPassword('') // OAuth пользователи не имеют пароля
            ->setActive(true)
            ->setApproved(true)
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default => []
            });

        // Устанавливаем опциональные данные
        $this->setOptionalUserData($user, $googleData);

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Обновляет данные существующего пользователя из Google
     *
     * @param User $user Пользователь для обновления
     * @param array $googleData Данные от Google
     */
    private function updateUserFromGoogleData(User $user, array $googleData): void
    {
        $user->setEmail($googleData['email'] ?? $user->getEmail());

        if (isset($googleData['given_name'])) {
            $user->setName($googleData['given_name']);
        }
        if (isset($googleData['family_name'])) {
            $user->setSurname($googleData['family_name']);
        }
        if (isset($googleData['picture'])) {
            $user->setImageExternalUrl($googleData['picture']);
        }

        // Устанавливаем опциональные данные
        $this->setOptionalUserData($user, $googleData);
    }

    /**
     * Устанавливает опциональные данные пользователя (телефон, пол, дата рождения)
     *
     * @param User $user Пользователь
     * @param array $googleData Данные от Google
     */
    private function setOptionalUserData(User $user, array $googleData): void
    {
        if (!empty($googleData['phone'])) {
            $user->setPhone2($googleData['phone']);
        }

        if (isset($googleData['gender'])) {
            $gender = match(strtolower($googleData['gender'])) {
                'male' => 'gender_male',
                'female' => 'gender_female',
                default => 'gender_neutral'
            };
            $user->setGender($gender);
        }

        if (isset($googleData['birthdate'])) {
            try {
                $user->setDateOfBirth(new DateTime($googleData['birthdate']));
            } catch (Exception) {
                // Игнорируем некорректные даты
            }
        }
    }
}
