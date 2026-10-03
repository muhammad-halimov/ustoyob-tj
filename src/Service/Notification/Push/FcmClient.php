<?php

namespace App\Service\Notification\Push;

use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;
use Throwable;

/**
 * Firebase Cloud Messaging, HTTP v1 API — push на Android и iOS (на iOS
 * Firebase сам доставляет через APNs, ключ APNs загружается в консоль
 * Firebase, бэкенду он не нужен).
 *
 * Ключ — JSON сервисного аккаунта Firebase (Project settings → Service
 * accounts → Generate new private key), путь к файлу — FIREBASE_CREDENTIALS
 * (.env.local). Пусто/файла нет — push просто выключены (isConfigured()).
 *
 * Авторизация — OAuth2 access token, который выдаёт Google по JWT,
 * подписанному ключом сервисного аккаунта (RS256, firebase/php-jwt). Токен
 * живёт час — кэшируется в cache.app (Redis) на 50 минут.
 */
class FcmClient
{
    private const string SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    /** @var array{project_id: string, client_email: string, private_key: string, token_uri: string}|false|null */
    private array|false|null $credentials = null;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly CacheInterface      $cache,
        private readonly LoggerInterface     $logger,
        #[Autowire('%env(default::resolve:FIREBASE_CREDENTIALS)%')]
        private readonly ?string             $credentialsPath = null,
    ) {}

    public function isConfigured(): bool
    {
        return $this->credentials() !== false;
    }

    /**
     * Отправка на одно устройство. Ответ не дожидается — запросы на несколько
     * устройств уходят параллельно, статус смотрит isDeadToken().
     *
     * @param array<string, string> $data
     */
    public function send(string $token, string $title, string $body, array $data, string $group): ResponseInterface
    {
        $credentials = $this->credentials();

        return $this->httpClient->request('POST', "https://fcm.googleapis.com/v1/projects/{$credentials['project_id']}/messages:send", [
            'auth_bearer' => $this->accessToken(),
            'json' => ['message' => [
                'token'        => $token,
                'notification' => ['title' => $title, 'body' => $body],
                'data'         => $data,
                // Канал создаёт приложение (см. utils/nativePush.ts на ветке mobile); tag — одно
                // уведомление на чат: новое сообщение заменяет предыдущее, а не копится стопкой.
                'android'      => ['priority' => 'HIGH', 'notification' => ['channel_id' => 'messages', 'tag' => $group, 'sound' => 'default']],
                'apns'         => ['payload' => ['aps' => ['sound' => 'default', 'thread-id' => $group]]],
            ]],
        ]);
    }

    /**
     * Токен устройства больше не действует (приложение удалено, токен
     * сменился) — его надо удалить. Сетевые и прочие сбои — не повод.
     */
    public function isDeadToken(ResponseInterface $response): bool
    {
        try {
            $status = $response->getStatusCode();
            if ($status < 400) return false;

            $error = $response->toArray(false)['error'] ?? [];
            $codes = array_map(fn(array $d) => $d['errorCode'] ?? null, $error['details'] ?? []);

            if ($status === 404 || in_array('UNREGISTERED', $codes, true) || in_array('SENDER_ID_MISMATCH', $codes, true))
                return true;

            // INVALID_ARGUMENT — бывает и из-за самого токена (мусорная строка).
            if ($status === 400 && str_contains(strtolower($error['message'] ?? ''), 'registration token'))
                return true;

            $this->logger->warning('FCM: уведомление не отправлено', ['status' => $status, 'error' => $error]);
        } catch (Throwable $e) {
            $this->logger->warning('FCM: сбой отправки', ['exception' => $e]);
        }

        return false;
    }

    /** @return array{project_id: string, client_email: string, private_key: string, token_uri: string}|false */
    private function credentials(): array|false
    {
        if ($this->credentials !== null) return $this->credentials;

        $path = trim((string) $this->credentialsPath);
        $json = $path !== '' && is_readable($path) ? json_decode((string) file_get_contents($path), true) : null;

        if (!is_array($json) || empty($json['project_id']) || empty($json['client_email']) || empty($json['private_key'])) {
            if ($path !== '') $this->logger->error('FCM: FIREBASE_CREDENTIALS не читается или это не ключ сервисного аккаунта', ['path' => $path]);
            return $this->credentials = false;
        }

        return $this->credentials = [
            'project_id'   => $json['project_id'],
            'client_email' => $json['client_email'],
            'private_key'  => $json['private_key'],
            'token_uri'    => $json['token_uri'] ?? 'https://oauth2.googleapis.com/token',
        ];
    }

    private function accessToken(): string
    {
        $credentials = $this->credentials();

        return $this->cache->get('fcm_access_token_' . md5($credentials['client_email']), function (ItemInterface $item) use ($credentials): string {
            $item->expiresAfter(3000);
            $now = time();

            $assertion = JWT::encode([
                'iss'   => $credentials['client_email'],
                'scope' => self::SCOPE,
                'aud'   => $credentials['token_uri'],
                'iat'   => $now,
                'exp'   => $now + 3600,
            ], $credentials['private_key'], 'RS256');

            return $this->httpClient->request('POST', $credentials['token_uri'], [
                'body' => ['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $assertion],
            ])->toArray()['access_token'];
        });
    }
}
