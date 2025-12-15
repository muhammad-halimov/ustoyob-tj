<?php

namespace App\Service\OAuth\Meta\Facebook;

use App\Entity\User;
use App\Entity\User\OAuthType;
use App\Service\OAuth\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use DateTime;
use Exception;
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
        $email = $userData['email'] ?? '';

        if ($user = $this->userRepository->findByFacebookId($facebookId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return $user;
        }

        if ($existingUser = $this->userRepository->findOneBy(['email' => $email])) {
            if ($existingUser->getOauthType() !== null) {
                throw new BadRequestHttpException('This email is already associated with another Meta account.');
            }

            $oauth = new OAuthType();
            $oauth->setFacebookId($facebookId);
            $existingUser->setOauthType($oauth);
            $this->updateUserData($existingUser, $userData);
            $this->entityManager->persist($oauth);
            $this->entityManager->flush();
            return $existingUser;
        }

        $domain = preg_replace('/^https?:\/\//', '', $_ENV['FRONTEND_URL']);

        $oauth = new OAuthType();
        $oauth->setFacebookId($facebookId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setEmail($userData['email'] ?? "facebook.$facebookId@$domain")
            ->setName(explode(' ', $userData['name'], 2)[0] ?? '')
            ->setSurname(explode(' ', $userData['name'], 2)[1] ?? '')
            ->setImageExternalUrl($userData['picture']['data']['url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setBio($userData['link'] ?? null)
            ->setGender(match($userData['gender'] ?? null) {
                'male' => 'gender_male',
                'female' => 'gender_female',
                default => 'gender_neutral'
            })
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default => ['ROLE_USER'],
            });

        if (isset($userData['birthday'])) {
            try {
                $birthday = DateTime::createFromFormat('m/d/Y', $userData['birthday']);
                if ($birthday !== false) {
                    $user->setDateOfBirth($birthday);
                }
            } catch (Exception) {}
        }

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    public function updateUserData(User $user, array $userData): void
    {
        if (isset($userData['name'])) {
            $nameParts = explode(' ', $userData['name'], 2);
            $user->setName($nameParts[0] ?? '');
            $user->setSurname($nameParts[1] ?? '');
        }

        if (isset($userData['picture']['data']['url'])) {
            $user->setImageExternalUrl($userData['picture']['data']['url']);
        }

        if (isset($userData['birthday'])) {
            try {
                $birthday = DateTime::createFromFormat('m/d/Y', $userData['birthday']);
                if ($birthday !== false) {
                    $user->setDateOfBirth($birthday);
                }
            } catch (Exception) {}
        }
    }
}
