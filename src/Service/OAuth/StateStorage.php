<?php

namespace App\Service\OAuth;

use Psr\Cache\InvalidArgumentException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class StateStorage
{
    private const int TTL = 600; // 10 минут

    public function __construct(private readonly CacheInterface $cache) {}

    /**
     * @param string $state
     * @return void
     * @throws InvalidArgumentException
     */
    public function add(string $state): void
    {
        $this->cache->get('oauth_state_' . $state, function (ItemInterface $item) {
            $item->expiresAfter(self::TTL);
            return true;
        });
    }

    public function has(string $state): bool
    {
        return $this->cache->hasItem('oauth_state_' . $state);
    }

    /**
     * @param string $state
     * @return void
     * @throws InvalidArgumentException
     */
    public function remove(string $state): void
    {
        $this->cache->delete('oauth_state_' . $state);
    }
}
