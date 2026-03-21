<?php

namespace App\Service\OAuth\Google;

use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Service\OAuth\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use DateTime;
use Exception;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

use App\Entity\User\Phone;

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
            throw new BadRequestHttpException(
                "Failed to exchange code with {$this->getProviderName()}. The code may be expired or invalid.",
                code: $e->getCode()
            );
        }
    }

    /**
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     */
    public function fetchUserData(array $tokens): array
    {
        if (!isset($tokens['id_token'])) {
            throw new BadRequestHttpException('No id_token received from Google');
        }

        $userData = $this->verifyIdToken($tokens['id_token']);

        if (isset($tokens['access_token'])) {
            $userData = array_merge($userData, $this->fetchAdditionalUserDetails($tokens['access_token']));
        }

        return $userData;
    }

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    private function verifyIdToken(string $idToken): array
    {
        if ($this->googlePublicKeys === null) {
            $this->googlePublicKeys = $this->httpClient
                ->request('GET', $_ENV['GOOGLE_CERTS_URI'])
                ->toArray();
        }

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($this->googlePublicKeys));
        } catch (Exception $e) {
            throw new BadRequestHttpException('Invalid ID token: ' . $e->getMessage());
        }

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

    public function findOrCreateUser(array $userData, ?string $role): User
    {
        if (!($userData['email_verified'] ?? false)) {
            throw new BadRequestHttpException('Unverified by Google');
        }

        $googleId = $userData['sub'];
        $email    = $userData['email'] ?? null;

        // 1. Already linked to this Google account
        if ($user = $this->userRepository->findByOAuthProvider('google', $googleId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return $user;
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
            return $existingUser;
        }

        // 3. New user
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

        return $user;
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
