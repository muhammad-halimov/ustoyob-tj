<?php

namespace App\Service\OAuth\Meta\Instagram;

use App\Entity\User;
use App\Entity\User\OAuthType;
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

        if ($user = $this->userRepository->findByInstagramId($instagramId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return $user;
        }

        $oauth = new OAuthType();
        $oauth->setInstagramId($instagramId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setUsername($userData['username'])
            ->setName(explode(' ', $userData['name'], 2)[0] ?? '')
            ->setSurname(explode(' ', $userData['name'], 2)[1] ?? '')
            ->setImageExternalUrl($userData['profile_picture_url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setBio($userData['biography'])
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

    public function updateUserData(User $user, array $userData): void
    {
        if (isset($userData['username'])) {
            $user->setUsername($userData['username']);
        }
        if (isset($userData['name'])) {
            $user->setName(explode(' ', $userData['name'], 2)[0]);
            $user->setSurname(explode(' ', $userData['name'], 2)[1]);
        }
        if (isset($userData['profile_picture_url'])) {
            $user->setImageExternalUrl($userData['profile_picture_url']);
        }
        if (isset($userData['biography'])) {
            $user->setBio($userData['biography']);
        }
    }
}
