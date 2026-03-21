<?php

namespace App\State\CollectionEntry;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Service\Extra\AccessService;
use Symfony\Bundle\SecurityBundle\Security;

abstract readonly class AbstractCollectionEntryStateProvider implements ProviderInterface
{
    public function __construct(
        protected ProviderInterface $collectionProvider,
        protected AccessService     $accessService,
        protected Security          $security,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|null|array
    {
        $this->accessService->check($this->security->getUser());

        return $this->collectionProvider->provide($operation, $uriVariables, $context);
    }
}
