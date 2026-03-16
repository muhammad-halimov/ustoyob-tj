<?php

namespace App\Service\OAuth\Meta\Facebook;

use App\Entity\User;
use App\Entity\UserOAuthProvider;
use App\Service\OAuth\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

class FacebookOAuthService extends AbstractOAuthService implements OAuthServiceInterface
{
    public function getProviderName(): string
    {
        return 'Facebook';
    }

    protected function getAuthUri(): string
    {
        return $_ENV['FACEBOOK_AUTH_URI'];
    }

    protected function getAuthParams(): array
    {
        return [
            'client_id' => $_ENV['OUATH_FACEBOOK_CLIENT_ID'],
            'redirect_uri' => $_ENV['FACEBOOK_REDIRECT_URI'],
            'response_type' => 'code',
            'scope' => implode(',', [
                'email',
                'user_birthday',
                'user_link',
                'user_age_range',
                'user_gender',
                'public_profile'
            ]),
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
            return $this->httpClient->request('GET', $_ENV['FACEBOOK_TOKEN_URI'], [
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
            throw new BadRequestHttpException(
                "Failed to exchange code with {$this->getProviderName()}. The code may be expired or invalid.",
                code: $e->getCode()
            );
        }
    }

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     */
    public function fetchUserData(array $tokens): array
    {
        $fields = ['id', 'name', 'email', 'picture', 'birthday', 'link', 'age_range', 'gender'];

        try {
            return $this->httpClient->request('GET', $_ENV['FACEBOOK_GRAPH_URI'], [
                'query' => [
                    'fields' => implode(',', $fields),
                    'access_token' => $tokens['access_token']
                ],
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            throw new BadRequestHttpException(
                "Failed to exchange token with {$this->getProviderName()}. The token may be expired or invalid.",
                code: $e->getCode()
            );
        }
    }

    public function findOrCreateUser(array $userData, ?string $role): User
    {
        $facebookId = $userData['id'];
        $email      = $userData['email'] ?? null;
        $nameParts  = explode(' ', $userData['name'] ?? '', 2);

        // 1. Already linked to this Facebook account
        if ($user = $this->userRepository->findByOAuthProvider('facebook', $facebookId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return $user;
        }

        // 2. Existing user with same email — link
        if ($email && ($existingUser = $this->userRepository->findOneBy(['email' => $email]))) {
            $op = (new UserOAuthProvider())
                ->setProvider('facebook')
                ->setProviderId($facebookId)
                ->setUser($existingUser);
            $this->entityManager->persist($op);
            $this->updateUserData($existingUser, $userData);
            $this->entityManager->flush();
            return $existingUser;
        }

        // 3. New user
        $user = (new User())
            ->setEmail($email ?? "oauth+facebook_{$facebookId}@internal.local")
            ->setName($nameParts[0] ?? '')
            ->setSurname($nameParts[1] ?? '')
            ->setImageExternalUrl($userData['picture']['data']['url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setBio($userData['link'] ?? null)
            ->setGender(match($userData['gender'] ?? null) {
                'male'   => 'gender_male',
                'female' => 'gender_female',
                default  => 'gender_neutral',
            })
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default  => ['ROLE_USER'],
            });

        $op = (new UserOAuthProvider())
            ->setProvider('facebook')
            ->setProviderId($facebookId)
            ->setUser($user);
        $this->entityManager->persist($op);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    public function updateUserData(User $user, array $userData): void
    {
        if (isset($userData['name'])) {
            $nameParts = explode(' ', $userData['name'], 2);
            if (empty($user->getName())) {
                $user->setName($nameParts[0] ?? '');
            }
            if (empty($user->getSurname())) {
                $user->setSurname($nameParts[1] ?? '');
            }
        }
        if (isset($userData['picture']['data']['url']) && empty($user->getImageExternalUrl())) {
            $user->setImageExternalUrl($userData['picture']['data']['url']);
        }
        if (isset($userData['email']) && str_contains($user->getEmail(), '@internal.local')) {
            $user->setEmail($userData['email']);
        }
    }
}
