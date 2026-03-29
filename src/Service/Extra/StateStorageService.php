<?php

namespace App\Service\Extra;

use Psr\Cache\InvalidArgumentException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class StateStorageService
{
    private const int TTL = 600;

    public function __construct(private readonly CacheInterface $cache) {}

    /** @throws InvalidArgumentException */
    public function save(string $key, string $value): void
    {
        $this->cache->delete($key);
        $this->cache->get($key, function (ItemInterface $item) use ($value): string {
            $item->expiresAfter(self::TTL);
            return $value;
        });
    }

    /** @throws InvalidArgumentException */
    public function get(string $key): ?string
    {
        if (!$this->cache->hasItem($key)) return null;

        return $this->cache->get($key, fn(ItemInterface $item): string => '');
    }

    /** @throws InvalidArgumentException */
    public function delete(string $key): void
    {
        $this->cache->delete($key);
    }
}
