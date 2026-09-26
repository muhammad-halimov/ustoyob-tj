<?php

namespace App\Service\OAuth\Meta\Facebook;

use App\ApiResource\AppMessages;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Exception\AppMessageException;
use App\Service\OAuth\Abstract\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

/**
 * Провайдер-специфичная реализация code+state flow для Facebook (см.
 * общий код-флоу в GeneralOAuth и разбивку шагов в AbstractOAuthService).
 * В отличие от Google, здесь нет id_token — профиль тянется отдельным
 * REST-запросом к Graph API /me (fetchUserData()) уже ПОСЛЕ обмена code
 * на access_token. Обмен токенов у Facebook идёт через GET с query-
 * параметрами (не POST+body, как у Google/Instagram) — так требует их API.
 */
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
        } catch (ClientExceptionInterface) {
            // ВНИМАНИЕ: как и у Google/Instagram — реальная причина отказа
            // Facebook (истёкший/повторный code, redirect_uri mismatch,
            // неверный client_secret) не логируется, наружу уходит один и
            // тот же generic OAUTH_CODE_EXCHANGE_FAILED.
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }
    }

    /**
     * Отдельный запрос к Graph API /me (в отличие от Google, где профиль
     * уже был в id_token) — те же ошибки обмена/доступа маскируются под
     * тот же generic OAUTH_CODE_EXCHANGE_FAILED, что и в
     * exchangeCodeForTokens() выше.
     *
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
        } catch (ClientExceptionInterface) {
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }
    }

    /**
     * Три сценария (см. UserManagementInterface). В отличие от Google,
     * здесь НЕТ проверки на "подтверждённый" email — Facebook Graph API
     * не отдаёт флаг верификации email в принципе, поэтому сценарий 2
     * (implicit link по email) здесь доверяет email от Facebook как есть.
     */
    public function findOrCreateUser(array $userData, ?string $role): array
    {
        $facebookId = $userData['id'];
        $email      = $userData['email'] ?? null;
        $nameParts  = explode(' ', $userData['name'] ?? '', 2);

        // 1. Already linked to this Facebook account
        if ($user = $this->userRepository->findByOAuthProvider('facebook', $facebookId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return ['user' => $user, 'isNew' => false];
        }

        // 2. Existing user with same email — link
        if ($email && ($existingUser = $this->userRepository->findOneBy(['email' => $email]))) {
            $op = (new OAuthProvider())
                ->setProvider('facebook')
                ->setProviderId($facebookId)
                ->setUser($existingUser);
            $this->entityManager->persist($op);
            $this->updateUserData($existingUser, $userData);
            $this->entityManager->flush();
            return ['user' => $existingUser, 'isNew' => false];
        }

        // 3. Пользователь уже авторизован (см. докблок $security в
        // AbstractOAuthService) и этот Facebook-аккаунт свободен — привязываем
        // к текущей сессии вместо создания несвязанного дубля.
        $currentUser = $this->security->getUser();
        if ($currentUser instanceof User) {
            $op = (new OAuthProvider())
                ->setProvider('facebook')
                ->setProviderId($facebookId)
                ->setUser($currentUser);
            $this->entityManager->persist($op);
            $this->updateUserData($currentUser, $userData);
            $this->entityManager->flush();

            return ['user' => $currentUser, 'isNew' => false];
        }

        // 4. New user
        $user = (new User())
            ->setEmail($email ?? "oauth+facebook_{$facebookId}@internal.local")
            ->setName($nameParts[0] ?? '')
            ->setSurname($nameParts[1] ?? '')
            ->setImageExternalUrl($userData['picture']['data']['url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setDescription($userData['link'] ?? null)
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

        $op = (new OAuthProvider())
            ->setProvider('facebook')
            ->setProviderId($facebookId)
            ->setUser($user);
        $this->entityManager->persist($op);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return ['user' => $user, 'isNew' => true];
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
