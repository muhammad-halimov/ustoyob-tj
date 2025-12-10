<?php

namespace App\Service\OAuth\Google;

use App\Entity\User;
use App\Entity\User\OAuthType;
use App\Repository\UserRepository;
use App\Service\OAuth\StateStorage;
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

class GoogleOAuthService
{
    private ?array $googlePublicKeys = null;

    public function __construct(
        private readonly HttpClientInterface      $httpClient,
        private readonly StateStorage             $stateStorage,
        private readonly UserRepository           $userRepository,
        private readonly EntityManagerInterface   $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
    ) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function generateGoogleOAuthRedirectUri(): string
    {
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->add($randomState);

        $queryParams = [
            'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
            'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'access_type' => 'offline',
            'state' => $randomState,
        ];

        $queryString = http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
        return "{$_ENV['GOOGLE_AUTH_URI']}?$queryString";
    }

    /**
     * @param string $code
     * @param string $state
     * @param string|null $role
     * @return array
     * @throws ClientExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws ServerExceptionInterface
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     */
    public function handleCode(string $code, string $state, ?string $role): array
    {
        if (!$this->stateStorage->has($state)) {
            throw new BadRequestHttpException('Invalid state');
        }

        $this->stateStorage->remove($state);

        try {
            $response = $this->httpClient->request('POST', $_ENV['GOOGLE_TOKEN_URI'], [
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ],
                'body' => http_build_query([
                    'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
                    'client_secret' => $_ENV['OAUTH_GOOGLE_CLIENT_SECRET'],
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
                    'code' => $code,
                ]),
            ]);

            $data = $response->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException('Failed to exchange code with Google. The code may be expired or invalid.', code: $e->getCode());
        }

        if (!isset($data['id_token'])) {
            throw new BadRequestHttpException('No id_token received from Google');
        }

        $userData = $this->verifyIdToken($data['id_token']);
        $user = $this->findOrCreateUser($userData, $role);
        $jwt = $this->jwtManager->create($user);

        return [
            'user' => $user,
            'token' => $jwt
        ];
    }

    /**
     * @param string $idToken
     * @return array
     * @throws TransportExceptionInterface
     * @throws ClientExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws ServerExceptionInterface
     */
    private function verifyIdToken(string $idToken): array
    {
        if ($this->googlePublicKeys === null) {
            $response = $this->httpClient->request('GET', $_ENV['GOOGLE_CERTS_URI']);
            $this->googlePublicKeys = $response->toArray();
        }

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($this->googlePublicKeys));
        } catch (Exception $e) {
            throw new BadRequestHttpException('Invalid ID token: ' . $e->getMessage());
        }

        if ($decoded->aud !== $_ENV['OAUTH_GOOGLE_CLIENT_ID']) {
            throw new BadRequestHttpException('Invalid token audience');
        }

        if (!in_array($decoded->iss, ["{$_ENV['GOOGLE_ACCOUNT_URI']}", 'accounts.google.com'])) {
            throw new BadRequestHttpException('Invalid token issuer');
        }

        if ($decoded->exp < time()) {
            throw new BadRequestHttpException('Token has expired');
        }

        return (array)$decoded;
    }

    private function findOrCreateUser(array $googleData, ?string $role): User
    {
        if (!isset($googleData['email_verified']) || !$googleData['email_verified']) {
            throw new BadRequestHttpException('Email not verified by Google');
        }

        $googleId = $googleData['sub'];
        $email = $googleData['email'] ?? '';

        // 1. Сначала ищем по Google ID
        $user = $this->userRepository->findByGoogleId($googleId);

        if ($user) {
            // Пользователь уже заходил через Google OAuth - обновляем данные
            $user->setEmail($email);
            if (isset($googleData['given_name'])) {
                $user->setName($googleData['given_name']);
            }
            if (isset($googleData['family_name'])) {
                $user->setSurname($googleData['family_name']);
            }
            if (isset($googleData['picture'])) {
                $user->setImageExternalUrl($googleData['picture']);
            }

            $this->entityManager->flush();
            return $user;
        }

        // 2. Ищем по email - возможно пользователь регистрировался через форму
        $existingUser = $this->userRepository->findOneBy(['email' => $email]);

        if ($existingUser) {
            // Пользователь существует с таким email

            // Проверяем, есть ли у него уже OAuth привязка
            if ($existingUser->getOauthType() !== null) {
                // У пользователя уже есть OAuth, но с другим Google ID
                throw new BadRequestHttpException(
                    'This email is already associated with another Google account. Please use the original account or contact support.'
                );
            }

            // Пользователь регистрировался через форму - привязываем Google OAuth
            $oauth = new OAuthType();
            $oauth->setGoogleId($googleId);

            $existingUser->setOauthType($oauth);

            // Обновляем данные из Google
            if (isset($googleData['given_name'])) {
                $existingUser->setName($googleData['given_name']);
            }
            if (isset($googleData['family_name'])) {
                $existingUser->setSurname($googleData['family_name']);
            }
            if (isset($googleData['picture'])) {
                $existingUser->setImageExternalUrl($googleData['picture']);
            }

            $this->entityManager->persist($oauth);
            $this->entityManager->flush();

            return $existingUser;
        }

        // 3. Создаем нового пользователя
        $oauth = new OAuthType();
        $oauth->setGoogleId($googleId);

        $user = new User();
        $user->setOauthType($oauth);
        $user->setEmail($email);
        $user->setName($googleData['given_name'] ?? '');
        $user->setSurname($googleData['family_name'] ?? '');
        $user->setImageExternalUrl($googleData['picture'] ?? '');
        $user->setPassword(''); // OAuth пользователи без пароля
        $user->setActive(true);
        $user->setApproved(true);

        // Устанавливаем роль
        if ($role === 'master') {
            $user->setRoles(['ROLE_MASTER']);
        } elseif ($role === 'client') {
            $user->setRoles(['ROLE_CLIENT']);
        } else {
            $user->setRoles(['ROLE_USER']); // Роль по умолчанию
        }

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }
}
