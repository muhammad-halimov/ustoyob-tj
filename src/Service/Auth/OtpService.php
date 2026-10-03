<?php

namespace App\Service\Auth;

use App\Service\Extra\StateStorageService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;

/**
 * Одноразовые 6-значные коды (смена пароля по email, коды из SMS) — в Redis,
 * через StateStorageService, 10 минут.
 *
 * Неверных попыток на один код — не больше MAX_ATTEMPTS, дальше код сгорает и
 * нужен новый: 6 цифр — миллион вариантов, без этого предела их перебирали бы
 * за 10 минут жизни кода (лимит по IP в ApiRateLimitSubscriber обходится
 * сменой адреса).
 */
class OtpService
{
    public const int TTL          = 600;
    public const int MAX_ATTEMPTS = 5;

    public function __construct(private readonly StateStorageService $stateStorage) {}

    /**
     * Новый код под ключом (старый, если был, перестаёт действовать).
     *
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function issue(string $key): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $this->stateStorage->save($key, json_encode(['code' => $code, 'exp' => time() + self::TTL, 'attempts' => 0]));

        return $code;
    }

    /**
     * Верный код — true, и код удаляется (одноразовый). Неверный — false и
     * попытка засчитывается.
     *
     * @throws InvalidArgumentException
     */
    public function verify(string $key, string $code): bool
    {
        $raw    = $this->stateStorage->get($key);
        $stored = $raw !== null ? json_decode($raw, true) : null;

        if (!is_array($stored) || ($stored['exp'] ?? 0) < time()) {
            if ($raw !== null) $this->stateStorage->delete($key);
            return false;
        }

        if (hash_equals((string) $stored['code'], trim($code))) {
            $this->stateStorage->delete($key);
            return true;
        }

        $stored['attempts'] = ($stored['attempts'] ?? 0) + 1;
        if ($stored['attempts'] >= self::MAX_ATTEMPTS) $this->stateStorage->delete($key);
        else $this->stateStorage->save($key, json_encode($stored));

        return false;
    }
}
