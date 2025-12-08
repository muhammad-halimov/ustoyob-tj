<?php
// src/Command/TestRedisCommand.php

namespace App\Command;

use Psr\Cache\InvalidArgumentException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Psr\Cache\CacheItemPoolInterface;

#[AsCommand(name: 'app:test-redis')]
class TestRedisCommand extends Command
{
    public function __construct(private readonly CacheItemPoolInterface $blockListTokenCachePool)
    {
        parent::__construct();
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // Test write
        $output->writeln('Attempting to write to Redis...');
        $cacheItem = $this->blockListTokenCachePool->getItem('test_key_123');
        $cacheItem->set('test_value');
        $cacheItem->expiresAfter(60);
        $result = $this->blockListTokenCachePool->save($cacheItem);

        $output->writeln($result ? '✓ Successfully wrote to Redis' : '✗ Failed to write to Redis');

        // Test read
        $output->writeln('Attempting to read from Redis...');
        $cacheItem = $this->blockListTokenCachePool->getItem('test_key_123');
        if ($cacheItem->isHit()) {
            $output->writeln('✓ Successfully read from Redis: ' . $cacheItem->get());
        } else {
            $output->writeln('✗ Could not read from Redis');
        }

        return Command::SUCCESS;
    }
}
