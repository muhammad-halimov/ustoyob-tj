<?php

namespace App\Service\OAuth\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use App\Exception\AppMessageException;
use App\Repository\User\UserRepository;
use App\Service\Extra\StateStorageService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use App\Service\OAuth\Interface\TokenExchangeInterface;
use App\Service\OAuth\Interface\UserDataFetcherInterface;
use App\Service\OAuth\Interface\UserManagementInterface;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Общая для Google/Facebook/Instagram реализация code+state OAuth-цикла —
 * полный код-флоу описан в GeneralOAuth, сюда попадает только шаги
 * generateOAuthRedirectUri()/handleCode() (state, обмен code, сборка
 * ответа); provider-специфичные шаги (URI/параметры авторизации, обмен
 * code, разбор профиля, поиск/создание User) — abstract-методы ниже,
 * реализуются в GoogleOAuthService/FacebookOAuthService/
 * InstagramOAuthService.
 *
 * Telegram сюда НЕ входит — у него нет code/state, свой отдельный
 * TelegramOAuthService со своим методом handleCallback().
 */
abstract class AbstractOAuthService implements
    OAuthServiceInterface,
    TokenExchangeInterface,
    UserDataFetcherInterface,
    UserManagementInterface
{
    /**
     * Префикс ключа в кэше для anti-CSRF state (см. generateOAuthRedirectUri/
     * handleCode) — тот же префикс, что и в LinkOAuthProviderController
     * (продублирован там как своя константа, а не переиспользован отсюда:
     * это НЕ общий стейт-стор двух разных вещей, а один и тот же namespace
     * состояний — state, порождённый /auth/{provider}/url, годится и для
     * логина через GeneralOAuth::callback, и для привязки через
     * ProfileOAuth::link — какой из двух путей его "погасит", решает
     * фронтенд самим выбором, куда отправить code/state).
     */
    private const string OAUTH_PREFIX = 'oauth_state_';

    public function __construct(
        protected readonly HttpClientInterface      $httpClient,
        protected readonly StateStorageService      $stateStorage,
        protected readonly UserRepository           $userRepository,
        protected readonly EntityManagerInterface   $entityManager,
        protected readonly JWTTokenManagerInterface $jwtManager,
        // БАГФИКС (26.09.2026, по жалобе "привязка Google плодит второй
        // аккаунт"): findOrCreateUser() ниже (реализации в Google/Facebook/
        // Instagram*OAuthService) раньше не знал о текущей сессии вообще —
        // если фронт по ошибке шлёт /auth/{provider}/callback (логин), а не
        // /profile/oauth/link, пока пользователь уже авторизован другим
        // способом (например Telegram), providerId ни к кому не привязан →
        // код падал в ветку "создать нового" и заводил сироту вместо
        // привязки к уже открытой сессии. $security нужен, чтобы поймать
        // этот случай ДО создания нового User — см. использование в каждом
        // конкретном *OAuthService::findOrCreateUser().
        protected readonly Security                 $security,
    ) {}

    /**
     * Первый шаг code+state flow — собрать URL согласия провайдера.
     * Anti-CSRF state: 16 случайных байт → hex, кладём в кэш на 10 минут
     * (StateStorageService::TTL) как ЕДИНСТВЕННОЕ доказательство "этот
     * code/state round-trip начали мы" — без него любой мог бы прислать
     * на /callback чужой code с произвольным state и подделать привязку.
     *
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function generateOAuthRedirectUri(): string
    {
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->save(self::OAUTH_PREFIX . $randomState, 'true');

        $queryParams = array_merge($this->getAuthParams(), ['state' => $randomState]);

        return $this->getAuthUri() . '?' . http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Второй-пятый шаги code+state flow — проверка state → обмен code на
     * токены → получение профиля → find-or-create пользователя → выдача
     * JWT. Именно этот метод дёргают {Provider}OAuthCallbackController'ы
     * через AbstractOAuthCallbackController — общий для всех трёх
     * провайдеров, provider-специфичны только exchangeCodeForTokens()/
     * fetchUserData()/findOrCreateUser() внутри.
     *
     * State одноразовый: get() + delete() СРАЗУ, до обмена code — повторный
     * вызов с тем же state (двойной сабмит, повтор запроса) второй раз
     * упадёт с OAUTH_INVALID_STATE ещё до похода к провайдеру.
     *
     * @param string $code
     * @param string $state
     * @param string|null $role 'master'|'client'|null — роль НОВОГО
     *                          пользователя, если его придётся создать
     *                          (findOrCreateUser); на уже существующего
     *                          не влияет.
     * @return array ['user' => User, 'token' => string, 'isNew' => bool]
     * @throws InvalidArgumentException
     */
    public function handleCode(string $code, string $state, ?string $role): array
    {
        if ($this->stateStorage->get(self::OAUTH_PREFIX . $state) === null) {
            throw new AppMessageException(AppMessages::OAUTH_INVALID_STATE);
        }

        $this->stateStorage->delete(self::OAUTH_PREFIX . $state);

        $tokens = $this->exchangeCodeForTokens($code);
        $userData = $this->fetchUserData($tokens);
        $result = $this->findOrCreateUser($userData, $role);

        return ['user' => $result['user'], 'token' => $this->jwtManager->create($result['user']), 'isNew' => $result['isNew']];
    }

    /**
     * Базовый URI страницы согласия провайдера (без query) — обычно
     * env-переменная вида {PROVIDER}_AUTH_URI.
     */
    abstract protected function getAuthUri(): string;

    /**
     * Query-параметры для URL авторизации: как минимум client_id,
     * redirect_uri, response_type, scope — состав и синтаксис scope у
     * каждого провайдера свой (Google — через пробел, Facebook — через
     * запятую), см. конкретные реализации.
     */
    abstract protected function getAuthParams(): array;

    // Методы из интерфейсов должны быть реализованы в подклассах —
    // см. докблоки соответствующих интерфейсов (TokenExchangeInterface/
    // UserDataFetcherInterface/UserManagementInterface/OAuthServiceInterface)
    // за смыслом каждого шага.
    abstract public function exchangeCodeForTokens(string $code): array;
    abstract public function fetchUserData(array $tokens): array;
    abstract public function findOrCreateUser(array $userData, ?string $role): array;
    abstract public function updateUserData(User $user, array $userData): void;
    abstract public function getProviderName(): string;
}
