<?php

namespace App\Service\OAuth;

use Psr\Cache\InvalidArgumentException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class StateStorage
{
    private const int TTL = 600; // Время жизни state в кеше (10 минут)

    public function __construct(private readonly CacheInterface $cache) {}

    /**
     * Добавляет новый state в кэш.
     * Используется при начале OAuth-процесса (например, Google OAuth),
     * чтобы затем проверить, что redirect пришёл от того же пользователя.
     *
     * @param string $state
     * @return void
     * @throws InvalidArgumentException
     */
    public function add(string $state): void
    {
        // Создаём элемент кеша с ключом oauth_state_<state> и сроком жизни TTL
        $this->cache->get('oauth_state_' . $state, function (ItemInterface $item) {
            $item->expiresAfter(self::TTL); // state живёт 10 минут
            return true; // Содержимое нам не важно — важно само наличие
        });
    }

    /**
     * Проверяет, существует ли state в кеше.
     * Используется после редиректа OAuth провайдера.
     *
     * @param string $state
     * @return bool
     */
    public function has(string $state): bool
    {
        // Проверка наличия записи oаuth_state_<state>
        return $this->cache->hasItem('oauth_state_' . $state);
    }

    /**
     * Удаляет state из кеша.
     * Нужно, чтобы state использовался строго один раз.
     *
     * @param string $state
     * @return void
     * @throws InvalidArgumentException
     */
    public function remove(string $state): void
    {
        // Удаляем state после успешной проверки
        $this->cache->delete('oauth_state_' . $state);
    }
}
