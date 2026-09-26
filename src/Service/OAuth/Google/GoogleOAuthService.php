<?php

namespace App\Service\OAuth\Google;

use App\ApiResource\AppMessages;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Entity\User\Phone;
use App\Exception\AppMessageException;
use App\Service\OAuth\Abstract\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use DateTime;
use Exception;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

/**
 * Провайдер-специфичная реализация code+state flow для Google (см. общий
 * код-флоу в GeneralOAuth и разбивку шагов в AbstractOAuthService).
 * Особенность Google среди трёх провайдеров: профиль приходит НЕ через
 * отдельный REST-запрос, а прямо в id_token (JWT, подписанный Google) —
 * exchangeCodeForTokens() отдаёт токены как есть, а fetchUserData()
 * сам верифицирует и декодирует id_token (verifyIdToken()), плюс
 * опционально добирает телефон/пол/дату рождения отдельным вызовом
 * People API (fetchAdditionalUserDetails() — эти поля не входят в
 * стандартный OIDC id_token).
 */
class GoogleOAuthService extends AbstractOAuthService implements OAuthServiceInterface
{
    private ?array $googlePublicKeys = null;

    public function getProviderName(): string
    {
        return 'Google';
    }

    protected function getAuthUri(): string
    {
        return $_ENV['GOOGLE_AUTH_URI'];
    }

    protected function getAuthParams(): array
    {
        return [
            'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
            'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
            'response_type' => 'code',
            'scope' => implode(' ', [
                'openid',
                'profile',
                'email',
                'https://www.googleapis.com/auth/user.phonenumbers.read',
                'https://www.googleapis.com/auth/user.gender.read',
                'https://www.googleapis.com/auth/user.birthday.read',
            ]),
            'access_type' => 'offline',
        ];
    }

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     */
    public function exchangeCodeForTokens(string $code): array
    {
        try {
            return $this->httpClient->request('POST', $_ENV['GOOGLE_TOKEN_URI'], [
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
            // ВНИМАНИЕ: реальная причина отказа Google (просроченный/уже
            // использованный code, redirect_uri mismatch, неверный
            // client_secret и т.д.) есть в $e->getResponse(), но нигде не
            // логируется — наружу всегда уходит одно и то же generic
            // сообщение. Это затрудняет диагностику на проде (см. также
            // такой же паттерн в Facebook/InstagramOAuthService).
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }
    }

    /**
     * В отличие от Facebook/Instagram, здесь нет отдельного вызова
     * профиля — id_token из exchangeCodeForTokens() УЖЕ содержит claims
     * (sub/email/given_name/...), их нужно только верифицировать
     * (verifyIdToken()). access_token используется отдельно, только чтобы
     * добрать поля, которых нет в id_token (телефон/пол/ДР).
     *
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     */
    public function fetchUserData(array $tokens): array
    {
        if (!isset($tokens['id_token'])) {
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }

        $userData = $this->verifyIdToken($tokens['id_token']);

        if (isset($tokens['access_token'])) {
            $userData = array_merge($userData, $this->fetchAdditionalUserDetails($tokens['access_token']));
        }

        return $userData;
    }

    /**
     * Проверяет подпись id_token по публичным ключам Google (JWKS,
     * кэшируются в $this->googlePublicKeys на время жизни запроса — не
     * персистентный кэш, только чтобы не дёргать /certs дважды за один
     * вызов), затем aud (наш client_id), iss (google) и exp (не истёк).
     * Любая нестыковка → TOKEN_INVALID_OR_EXPIRED, без деталей — это
     * ожидаемо строже, чем обмен code, т.к. подделанный/чужой id_token —
     * прямая попытка подмены личности, а не просто сетевая ошибка.
     *
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    private function verifyIdToken(string $idToken): array
    {
        if ($this->googlePublicKeys === null) {
            // БАГФИКС (26.08.2026, найден при аудите на предмет
            // необработанных 500): этот запрос раньше не был обёрнут
            // try/catch вовсе — временная недоступность/таймаут/5xx у
            // Google (GOOGLE_CERTS_URI) вылетал бы необработанным
            // TransportExceptionInterface/ServerExceptionInterface прямо
            // из fetchUserData(), в 500 Internal Server Error вместо
            // внятной ошибки — тот же класс бага, что был у email/login
            // в User (см. её докблок), просто источник исключения другой
            // (сеть, а не БД).
            try {
                $this->googlePublicKeys = $this->httpClient
                    ->request('GET', $_ENV['GOOGLE_CERTS_URI'])
                    ->toArray();
            } catch (Exception) {
                throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
            }
        }

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($this->googlePublicKeys));
        } catch (Exception) {
            throw new AppMessageException(AppMessages::TOKEN_INVALID_OR_EXPIRED);
        }

        if ($decoded->aud !== $_ENV['OAUTH_GOOGLE_CLIENT_ID']) {
            throw new AppMessageException(AppMessages::TOKEN_INVALID_OR_EXPIRED);
        }

        if (!in_array($decoded->iss, [$_ENV['GOOGLE_ACCOUNT_URI'], 'accounts.google.com'])) {
            throw new AppMessageException(AppMessages::TOKEN_INVALID_OR_EXPIRED);
        }

        if ($decoded->exp < time()) {
            throw new AppMessageException(AppMessages::TOKEN_INVALID_OR_EXPIRED);
        }

        return (array)$decoded;
    }

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    private function fetchAdditionalUserDetails(string $accessToken): array
    {
        try {
            $data = $this->httpClient->request('GET', $_ENV['GOOGLE_ACCOUNT_ADDITIONAL_INFO_URI'], [
                'headers' => ['Authorization' => "Bearer $accessToken"],
                'query' => ['personFields' => 'phoneNumbers,genders,birthdays']
            ])->toArray();

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
            return ['phone' => null, 'gender' => null, 'birthdate' => null];
        }
    }

    /**
     * Три сценария (см. UserManagementInterface) — здесь ещё и жёсткое
     * требование email_verified: Google отдаёт email всегда, но он может
     * быть НЕ подтверждён (редко, но возможно), а сценарий 2 (implicit
     * link по email) без верификации был бы дырой — кто угодно мог бы
     * привязаться к чужому аккаунту по email, который на самом деле ему
     * не принадлежит.
     */
    public function findOrCreateUser(array $userData, ?string $role): array
    {
        if (!($userData['email_verified'] ?? false)) {
            throw new AppMessageException(AppMessages::OAUTH_UNVERIFIED_EMAIL);
        }

        $googleId = $userData['sub'];
        $email    = $userData['email'] ?? null;

        // 1. Already linked to this Google account
        if ($user = $this->userRepository->findByOAuthProvider('google', $googleId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return ['user' => $user, 'isNew' => false];
        }

        // 2. Existing user with same verified email — link
        if ($email && ($existingUser = $this->userRepository->findOneBy(['email' => $email]))) {
            $op = (new OAuthProvider())
                ->setProvider('google')
                ->setProviderId($googleId)
                ->setUser($existingUser);
            $this->entityManager->persist($op);
            $this->updateUserData($existingUser, $userData);
            $this->entityManager->flush();
            return ['user' => $existingUser, 'isNew' => false];
        }

        // 3. Пользователь уже авторизован (валидный Bearer у уже открытой сессии,
        // например через Telegram) и этот Google-аккаунт свободен — привязываем
        // к текущей сессии вместо создания несвязанного дубля. См. докблок
        // $security в AbstractOAuthService — это тот самый случай "залогинился
        // одним способом, потом по ошибке дёрнул логин вторым вместо
        // /profile/oauth/link". updateUserData() сама подставит настоящий email
        // вместо плейсхолдера @internal.local, если он верифицирован (см. её код).
        $currentUser = $this->security->getUser();
        if ($currentUser instanceof User) {
            $op = (new OAuthProvider())
                ->setProvider('google')
                ->setProviderId($googleId)
                ->setUser($currentUser);
            $this->entityManager->persist($op);
            $this->updateUserData($currentUser, $userData);
            $this->entityManager->flush();

            return ['user' => $currentUser, 'isNew' => false];
        }

        // 4. New user
        $user = (new User())
            ->setEmail($email ?? "oauth+google_{$googleId}@internal.local")
            ->setName($userData['given_name'] ?? '')
            ->setSurname($userData['family_name'] ?? '')
            ->setImageExternalUrl($userData['picture'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default  => ['ROLE_USER'],
            });

        $this->setOptionalUserData($user, $userData);

        $op = (new OAuthProvider())
            ->setProvider('google')
            ->setProviderId($googleId)
            ->setUser($user);
        $this->entityManager->persist($op);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return ['user' => $user, 'isNew' => true];
    }

    public function updateUserData(User $user, array $userData): void
    {
        if (empty($user->getName()) && isset($userData['given_name'])) {
            $user->setName($userData['given_name']);
        }
        if (empty($user->getSurname()) && isset($userData['family_name'])) {
            $user->setSurname($userData['family_name']);
        }
        if (empty($user->getImageExternalUrl()) && isset($userData['picture'])) {
            $user->setImageExternalUrl($userData['picture']);
        }
        if (($userData['email_verified'] ?? false) && isset($userData['email'])
            && str_contains($user->getEmail(), '@internal.local')) {
            $user->setEmail($userData['email']);
        }
    }

    private function setOptionalUserData(User $user, array $googleData): void
    {
        if (!empty($googleData['phone'])) {
            $phone = new Phone();
            $phone->setPhone($googleData['phone']);
            $user->addPhone($phone);
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
            } catch (Exception) {}
        }
    }
}
