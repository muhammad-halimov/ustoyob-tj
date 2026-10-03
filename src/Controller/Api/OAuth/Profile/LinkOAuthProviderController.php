<?php

namespace App\Controller\Api\OAuth\Profile;

use App\ApiResource\AppMessages;
use App\Service\Extra\UuidUtil;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Exception\AppMessageException;
use App\Repository\User\UserOAuthProviderRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\StateStorageService;
use App\Service\OAuth\Google\GoogleOAuthService;
use App\Service\OAuth\Meta\Facebook\FacebookOAuthService;
use App\Service\OAuth\Meta\Instagram\InstagramOAuthService;
use App\Service\OAuth\Telegram\TelegramHashVerifierService;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;


/**
 * POST /profile/oauth/link — привязать доп. провайдера к УЖЕ
 * залогиненному пользователю (см. докблок ProfileOAuth за общей картиной,
 * там же — про разделяемый namespace state с логин-флоу GeneralOAuth).
 *
 * Единственный контроллер во всём OAuth-подсистеме, который обслуживает
 * ВСЕ ЧЕТЫРЕ провайдера сразу (Google/Facebook/Instagram/Telegram) одним
 * телом метода — в отличие от login-флоу, где у каждого провайдера свой
 * набор Url/Callback контроллеров. Ветвление по провайдеру — внутри
 * resolveProviderId().
 *
 * Telegram-ветка проверяет HMAC-подпись виджета (verifyTelegramHash() →
 * TelegramHashVerifierService, общий с TelegramOAuthService::
 * handleCallback() — login-флоу) и свежесть auth_date.
 */
class LinkOAuthProviderController extends AbstractController
{
    private const array  VALID_PROVIDERS = ['google', 'facebook', 'instagram', 'telegram'];

    /**
     * Тот же литерал, что и AbstractOAuthService::OAUTH_PREFIX — общий
     * namespace state-ключей (см. докблок константы там); продублирован
     * здесь отдельной константой, а не импортирован, потому что этот
     * контроллер не наследует AbstractOAuthService.
     */
    private const string OAUTH_PREFIX    = 'oauth_state_';

    public function __construct(
        private readonly Security                    $security,
        private readonly AccessService               $accessService,
        private readonly EntityManagerInterface      $entityManager,
        private readonly UserOAuthProviderRepository $oauthProviderRepository,
        private readonly StateStorageService         $stateStorage,
        private readonly GoogleOAuthService          $googleService,
        private readonly FacebookOAuthService        $facebookService,
        private readonly InstagramOAuthService       $instagramService,
        private readonly TelegramHashVerifierService $telegramHashVerifier,
        private readonly JWTTokenManagerInterface    $jwtManager,
    ) {}

    /**
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->security->getUser();
        $this->accessService->check($currentUser);

        $body     = json_decode($request->getContent(), true) ?? [];
        $provider = (string) ($body['provider'] ?? '');

        if (!in_array($provider, self::VALID_PROVIDERS, true)) {
            throw new AppMessageException(AppMessages::OAUTH_INVALID_PROVIDER, 'Must be one of: ' . implode(', ', self::VALID_PROVIDERS));
        }

        ['id' => $providerId, 'email' => $realEmail] = $this->resolveProviderId($provider, $body);

        // Уникальность (provider, providerId) — на уровне БД тоже (см.
        // uq_provider_id в OAuthProvider), но здесь проверяем заранее,
        // чтобы вернуть осмысленную ошибку, а не поймать констрейнт-
        // violation при flush().
        $existing = $this->oauthProviderRepository->findOneByProviderAndId($provider, $providerId);

        if ($existing !== null) {
            // Тот же providerId уже привязан — либо к ДРУГОМУ юзеру
            // (кто-то опередил / это чужой аккаунт — TAKEN), либо к
            // текущему же (повторный клик — ALREADY_LINKED).
            if (!UuidUtil::same($existing->getUser()->getId(), $currentUser->getId())) {
                throw new AppMessageException(AppMessages::OAUTH_PROVIDER_TAKEN);
            }
            throw new AppMessageException(AppMessages::OAUTH_ALREADY_LINKED);
        }

        // Если юзер раньше завёлся без реального email (плейсхолдер
        // @internal.local — например, пришёл через Instagram/Telegram, — или
        // вовсе без email: зарегистрировался по телефону) и провайдер, который сейчас
        // привязываем, ЗНАЕТ реальный email — заполняем его и выдаём
        // свежий JWT (email — часть claims токена, старый токен был бы
        // рассинхронизирован).
        $emailUpdated = false;
        if ($realEmail !== null && ($currentUser->getEmail() === null || str_contains($currentUser->getEmail(), '@internal.local'))) {
            $currentUser->setEmail($realEmail);
            $emailUpdated = true;
        }

        $op = (new OAuthProvider())
            ->setProvider($provider)
            ->setProviderId($providerId)
            ->setUser($currentUser);
        $this->entityManager->persist($op);
        $this->entityManager->flush();

        $responseData = ['providers' => $this->buildProvidersList($currentUser)];

        if ($emailUpdated) {
            $responseData['new_token'] = $this->jwtManager->create($currentUser);
            $responseData['new_email'] = $currentUser->getEmail();
        }

        return $this->json($responseData);
    }

    /**
     * @param string $provider
     * @param array $body
     * @return array
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws ServerExceptionInterface
     * @throws TransportExceptionInterface
     */
    /**
     * Ветвится на два принципиально разных под-флоу: Telegram (проверка
     * HMAC-подписи виджета) vs Google/Facebook/Instagram (тот же
     * code+state обмен, что и в login-флоу, только через сервисы
     * напрямую, не через handleCode() — состояние/exchange/fetch
     * разложены здесь вручную, а не переиспользуют
     * AbstractOAuthService::handleCode(), т.к. этому контроллеру не нужен
     * шаг findOrCreateUser/JWT — только id + email профиля).
     *
     * @return array{id: string, email: ?string}
     */
    private function resolveProviderId(string $provider, array $body): array
    {
        if ($provider === 'telegram') {
            $id       = (string) ($body['id'] ?? '');
            $hash     = (string) ($body['hash'] ?? '');
            $authDate = (int)    ($body['auth_date'] ?? 0);

            if ($id === '' || $hash === '') {
                throw new AppMessageException(AppMessages::OAUTH_ID_HASH_REQUIRED);
            }
            if (time() - $authDate > 600) {
                throw new AppMessageException(AppMessages::OAUTH_TELEGRAM_EXPIRED);
            }

            $this->verifyTelegramHash($body, $hash);

            return ['id' => $id, 'email' => null];
        }

        // Google / Facebook / Instagram — code + state flow
        $code  = (string) ($body['code'] ?? '');
        $state = (string) ($body['state'] ?? '');

        if ($code === '' || $state === '') {
            throw new AppMessageException(AppMessages::OAUTH_CODE_STATE_REQUIRED, 'for ' . $provider);
        }

        if ($this->stateStorage->get(self::OAUTH_PREFIX . $state) === null) {
            throw new AppMessageException(AppMessages::OAUTH_INVALID_STATE);
        }
        $this->stateStorage->delete(self::OAUTH_PREFIX . $state);

        $service = match($provider) {
            'google'    => $this->googleService,
            'facebook'  => $this->facebookService,
            'instagram' => $this->instagramService,
        };

        $tokens   = $service->exchangeCodeForTokens($code);
        $userData = $service->fetchUserData($tokens);

        return match($provider) {
            'google'    => [
                'id'    => (string) $userData['sub'],
                'email' => ($userData['email_verified'] ?? false) ? ($userData['email'] ?? null) : null,
            ],
            'facebook'  => [
                'id'    => (string) $userData['id'],
                'email' => $userData['email'] ?? null,
            ],
            'instagram' => [
                'id'    => (string) $userData['id'],
                'email' => null,
            ],
        };
    }

    /**
     * БАГФИКС (27.08.2026): раньше здесь была своя копия проверки HMAC, с
     * секретом из $_ENV['OUATH_TELEGRAM_CLIENT_SECRET'] — переменной,
     * которой нет ни в одном .env этого проекта, т.е. эта проверка скорее
     * всего ВСЕГДА проваливалась (пустой секрет → hash никогда не
     * совпадёт) — привязка Telegram, судя по всему, была сломана точно
     * так же, как оказался сломан логин через Telegram (см.
     * TelegramOAuthService). Теперь оба флоу используют один и тот же
     * TelegramHashVerifierService с TELEGRAM_AUTH_BOT_TOKEN (см. её
     * докблок — это токен ОТДЕЛЬНОГО бота ustoyobtj_auth_bot, не
     * TELEGRAM_BOT_TOKEN, который принадлежит боту техподдержки).
     */
    private function verifyTelegramHash(array $body, string $hash): void
    {
        $fields = [];
        foreach (['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'] as $key) {
            if (isset($body[$key]) && $body[$key] !== '') {
                $fields[$key] = (string) $body[$key];
            }
        }

        if (!$this->telegramHashVerifier->verify($fields, $hash)) {
            throw new AppMessageException(AppMessages::OAUTH_INVALID_SIGNATURE);
        }
    }

    private function buildProvidersList(User $user): array
    {
        return array_map(
            fn(OAuthProvider $p) => [
                'provider' => $p->getProvider(),
                'linkedAt' => $p->getCreatedAt()->format(DateTimeInterface::ATOM),
            ],
            $user->getOauthProviders()->toArray()
        );
    }
}
