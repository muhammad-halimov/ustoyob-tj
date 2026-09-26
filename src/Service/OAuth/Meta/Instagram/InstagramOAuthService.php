<?php

namespace App\Service\OAuth\Meta\Instagram;

use App\ApiResource\AppMessages;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Exception\AppMessageException;
use App\Repository\User\UserRepository;
use App\Service\Extra\StateStorageService;
use App\Service\OAuth\Abstract\AbstractOAuthService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Провайдер-специфичная реализация code+state flow для Instagram (см.
 * общий код-флоу в GeneralOAuth и разбивку шагов в AbstractOAuthService).
 * Ключевое отличие от Google/Facebook: Instagram Graph API НИКОГДА не
 * отдаёт email (см. $fields в fetchUserData() ниже — там его просто нет),
 * поэтому findOrCreateUser() здесь ДВУХступенчатый, а не трёхступенчатый
 * — сценарий "existing user by verified email" (тир 2 у Google/Facebook)
 * невозможен в принципе, сразу либо уже привязанный юзер, либо новый.
 *
 * В отличие от Google/FacebookOAuthService, сюда добавлен собственный
 * конструктор с LoggerInterface (25.08.2026) — специально для того, чтобы
 * логировать реальный ответ Instagram при ошибке обмена code/профиля
 * (см. exchangeCodeForTokens()/fetchUserData() ниже), т.к. именно этот
 * провайдер регулярно ломается непонятным для юзера/фронта generic-
 * сообщением "Мубодилаи код бо провайдер ноком шуд" без единой зацепки в
 * логах — Google/Facebook эту же проблему пока не получили (см. их
 * докблоки), но при повторении её там стоит применить тот же приём.
 */
class InstagramOAuthService extends AbstractOAuthService implements OAuthServiceInterface
{
    public function __construct(
        HttpClientInterface           $httpClient,
        StateStorageService           $stateStorage,
        UserRepository                $userRepository,
        EntityManagerInterface        $entityManager,
        JWTTokenManagerInterface      $jwtManager,
        Security                      $security,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct($httpClient, $stateStorage, $userRepository, $entityManager, $jwtManager, $security);
    }

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
            // Логируем реальный ответ Instagram (не $e->getMessage() — она
            // обычно просто "HTTP 400 returned..." без тела) — getContent(false)
            // не бросает исключение повторно, даже если тело не парсится.
            // Смотреть в логи по этому сообщению при жалобах на
            // /auth/instagram/callback — раньше причина была не видна
            // вообще, наружу уходил только generic OAUTH_CODE_EXCHANGE_FAILED.
            $this->logger->error('Instagram OAuth: обмен code на токен не удался', [
                'status' => $e->getResponse()->getStatusCode(),
                'body'   => $e->getResponse()->getContent(false),
            ]);
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
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
        // Обратите внимание: email тут нет и не будет — Instagram Graph
        // API его просто не отдаёт ни в каком поле.
        $fields = ['id', 'username', 'name', 'profile_picture_url', 'biography'];

        // БАГФИКС (25.08.2026, найден по продовым логам): Meta задепрекейтила
        // алиас /me в новом "Instagram API with Instagram Login" (том самом,
        // что использует scope instagram_business_basic) — INSTAGRAM_GRAPH_URI
        // исторически указывает на https://graph.instagram.com/me (так и
        // прописано в .oauth.credentials на проде), но сейчас Instagram
        // отвечает 400 "Unsupported request - method type: get" (IGApiException,
        // code 100) на любой GET к /me — ДО того, как вообще проверяет fields.
        // Правильный путь — /{user_id}, где user_id приходит прямо в ответе
        // exchangeCodeForTokens() рядом с access_token (см. текущий формат
        // ответа short-lived token exchange у Instagram API with Instagram
        // Login). Поэтому здесь подменяем хвост "/me" на "/{user_id}", а не
        // берём INSTAGRAM_GRAPH_URI как готовый URL — это устойчиво и к
        // будущим смена версии в самой переменной (например .../v21.0/me).
        $userId = $tokens['user_id'] ?? null;
        if ($userId === null) {
            $this->logger->error('Instagram OAuth: в ответе обмена code нет user_id', ['tokens' => array_keys($tokens)]);
            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }

        $graphBaseUri = preg_replace('#/me/?$#', '', rtrim($_ENV['INSTAGRAM_GRAPH_URI'], '/'));
        $uri = $graphBaseUri . '/' . $userId;

        try {
            return $this->httpClient->request('GET', $uri, [
                'query' => [
                    'fields' => implode(',', $fields),
                    'access_token' => $tokens['access_token']
                ],
            ])->toArray();
        } catch (ClientExceptionInterface $e) {
            $body = $e->getResponse()->getContent(false);

            $this->logger->error('Instagram OAuth: не удалось получить профиль пользователя', [
                'status' => $e->getResponse()->getStatusCode(),
                'body'   => $body,
            ]);

            // Известный жёсткий кейс платформы (найден по продовым логам
            // 25.08.2026): "Unsupported request - method type: get"
            // (IGApiException, code 100) на этом конкретном запросе — не
            // временная ошибка сети/API, а следствие того, что аккаунт,
            // которым логинятся, Personal, а не Professional (Business/
            // Creator). С закрытия Instagram Basic Display API (04.12.2024)
            // у Personal-аккаунтов вообще нет официального способа получить
            // профиль через Instagram API with Instagram Login — конвертация
            // на стороне кода невозможна, это ограничение платформы. Отдаём
            // осмысленную ошибку вместо generic OAUTH_CODE_EXCHANGE_FAILED.
            $decoded = json_decode($body, true);
            if (($decoded['error']['code'] ?? null) === 100
                && str_contains($decoded['error']['message'] ?? '', 'Unsupported request')) {
                throw new AppMessageException(AppMessages::OAUTH_INSTAGRAM_PROFESSIONAL_REQUIRED);
            }

            throw new AppMessageException(AppMessages::OAUTH_CODE_EXCHANGE_FAILED);
        }
    }

    /**
     * Двухступенчатый вариант UserManagementInterface (без тира
     * "existing user by email" — см. докблок класса).
     */
    public function findOrCreateUser(array $userData, ?string $role): array
    {
        $instagramId = $userData['id'];
        $nameParts   = explode(' ', $userData['name'] ?? '', 2);

        // 1. Already linked to this Instagram account
        if ($user = $this->userRepository->findByOAuthProvider('instagram', $instagramId)) {
            $this->updateUserData($user, $userData);
            $this->entityManager->flush();
            return ['user' => $user, 'isNew' => false];
        }

        // 2. Пользователь уже авторизован (см. докблок $security в
        // AbstractOAuthService) и этот Instagram-аккаунт свободен — привязываем
        // к текущей сессии вместо создания несвязанного дубля.
        $currentUser = $this->security->getUser();
        if ($currentUser instanceof User) {
            $op = (new OAuthProvider())
                ->setProvider('instagram')
                ->setProviderId($instagramId)
                ->setUser($currentUser);
            $this->entityManager->persist($op);
            $this->updateUserData($currentUser, $userData);
            $this->entityManager->flush();

            return ['user' => $currentUser, 'isNew' => false];
        }

        // 3. New user — Instagram never provides email
        $user = (new User())
            ->setEmail("oauth+instagram_{$instagramId}@internal.local")
            ->setLogin($userData['username'] ?? null)
            ->setName($nameParts[0] ?? '')
            ->setSurname($nameParts[1] ?? '')
            ->setImageExternalUrl($userData['profile_picture_url'] ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setDescription($userData['biography'] ?? null)
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

        return ['user' => $user, 'isNew' => true];
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
        if (isset($userData['biography']) && empty($user->getDescription())) {
            $user->setDescription($userData['biography']);
        }
    }
}
