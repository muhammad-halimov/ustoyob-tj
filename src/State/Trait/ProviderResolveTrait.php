<?php

namespace App\State\Trait;

use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

/**
 * Трейт для выбора нужного провайдера в зависимости от типа операции.
 *
 * Требует, чтобы в использующем классе были свойства:
 *   protected ProviderInterface $itemProvider;
 *   protected ProviderInterface $collectionProvider;
 *
 * Логика:
 *   - GetCollection → $this->collectionProvider
 *   - Любая другая операция (Get, Post, Patch, …) → $this->itemProvider
 */
trait ProviderResolveTrait
{
    private function resolveProvider(Operation $operation): ProviderInterface
    {
        return $operation instanceof GetCollection ? $this->collectionProvider : $this->itemProvider;
    }
}
