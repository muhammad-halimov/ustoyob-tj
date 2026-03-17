<?php

namespace App\Service\OAuth\Meta\Instagram;

use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Service\OAuth\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

class InstagramOAuthService extends AbstractOAuthService implements OAuthServiceInterface
{
    public function getProviderName(): string
    {
        return 'Instagram';
    }

    protected function getAuthUri(): string
    {
        return $_ENV['INSTAGRAM_AUTH_URI'];
    }

    protected function getAuthParams(): array
    {
        return [
            'force_reauth' => true,
            'client_id' => $_ENV['OUATH_INSTAGRAM_CLIENT_ID'],
            'redirect_uri' => $_ENV['INSTAGRAM_REDIRECT_URI'],
            'response_type' => 'code',
            'scope' => 'instagram_business_basic',
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
            return $this->httpClient->request('POST', $_ENV['INSTAGRAM_TOKEN_URI'], [
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
        $fields = ['id', 'username', 'name', 'profile_picture_url', 'biography'];

        try {
            return $this->httpClient->request('GET', $_ENV['INSTAGRAM_GRAPH_URI'], [
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
        $instagramId = $userData['id'];
        $nameParts   = explode(' ', $userData['name'] ?? '', 2);

        // 1. Already linked to this Instagram account
        if ($user = $this->userRepository->findByOAuthProvider('instagram', $instagramId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return $user;
        }

        // 2. New user — Instagram never provides email
        $user = (new User())
            ->setEmail("oauth+instagram_{$instagramId}@internal.local")
            ->setLogin($userData['username'] ?? null)
            ->setName($nameParts[0] ?? '')
            ->setSurname($nameParts[1] ?? '')
            ->setImageExternalUrl($userData['profile_picture_url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setBio($userData['biography'] ?? null)
            ->setGender('gender_neutral')
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default  => ['ROLE_USER'],
            });

        $op = (new OAuthProvider())
            ->setProvider('instagram')
            ->setProviderId($instagramId)
            ->setUser($user);
        $this->entityManager->persist($op);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    public function updateUserData(User $user, array $userData): void
    {
        if (isset($userData['username']) && empty($user->getLogin())) {
            $user->setLogin($userData['username']);
        }
        if (isset($userData['name'])) {
            $nameParts = explode(' ', $userData['name'], 2);
            if (empty($user->getName())) {
                $user->setName($nameParts[0]);
            }
            if (empty($user->getSurname())) {
                $user->setSurname($nameParts[1] ?? '');
            }
        }
        if (isset($userData['profile_picture_url']) && empty($user->getImageExternalUrl())) {
            $user->setImageExternalUrl($userData['profile_picture_url']);
        }
        if (isset($userData['biography']) && empty($user->getBio())) {
            $user->setBio($userData['biography']);
        }
    }
}
