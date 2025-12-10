<?php

namespace App\Service\OAuth\Google;

use App\Entity\OAuth\OAuthType;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\OAuth\StateStorage;
use Doctrine\ORM\EntityManagerInterface;
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
     */
    public function handleCode(string $code, string $state, ?string $role): array
    {
        if (!$this->stateStorage->has($state)) {
            throw new BadRequestHttpException('Invalid state');
        }

        $response = $this->httpClient->request('POST', $_ENV['GOOGLE_TOKEN_URI'], [
            'body' => [
                'client_id' => $_ENV['OAUTH_GOOGLE_CLIENT_ID'],
                'client_secret' => $_ENV['OAUTH_GOOGLE_CLIENT_SECRET'],
                'grant_type' => 'authorization_code',
                'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'],
                'code' => $code,
            ],
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new BadRequestHttpException('Failed to get token from Google: ' . $response->getContent());
        }

        $data = $response->toArray();
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

        $decoded = JWT::decode($idToken, JWK::parseKeySet($this->googlePublicKeys));

        if ($decoded->aud !== $_ENV['OAUTH_GOOGLE_CLIENT_ID']) {
            throw new BadRequestHttpException('Invalid token audience');
        }

        if (!in_array($decoded->iss, [$_ENV['GOOGLE_ACCOUNT_URI'], 'accounts.google.com'])) {
            throw new BadRequestHttpException('Invalid token issuer');
        }

        if ($decoded->exp < time()) {
            throw new BadRequestHttpException('Token has expired');
        }

        return (array)$decoded;
    }

    private function findOrCreateUser(array $googleData, ?string $role): User
    {
        $googleId = $googleData['sub'];

        $user = $this->userRepository->findByGoogleId($googleId);

        if ($user) {
            $user->setEmail($googleData['email']);
            $user->setName($googleData['given_name']);
            $user->setSurname($googleData['family_name']);
            $user->setImageExternalUrl($googleData['picture']);

            $this->entityManager->flush();
            return $user;
        }

        if (!$googleData['email_verified']) {
            throw new BadRequestHttpException('Unverified by Google™®');
        }

        $oauth = new OAuthType();
        $oauth->setGoogleId($googleId);

        $user = new User();
        $user->setOauthType($oauth);
        $user->setEmail($googleData['email']);
        $user->setName($googleData['given_name']);
        $user->setSurname($googleData['family_name']);
        $user->setImageExternalUrl($googleData['picture']);
        $user->setPassword('');
        $user->setActive(true);
        $user->setApproved(true);

        if ($role === 'master') {
            $user->setRoles(['ROLE_MASTER']);
        } elseif ($role === 'client') {
            $user->setRoles(['ROLE_CLIENT']);
        }

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }
}
