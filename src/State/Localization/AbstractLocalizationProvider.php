<?php

namespace App\State\Localization;

use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Service\Extra\LocalizationService;
use App\State\Trait\LocaleResolveTrait;
use App\State\Trait\ProviderResolveTrait;
use Symfony\Component\HttpFoundation\RequestStack;

abstract readonly class AbstractLocalizationProvider implements ProviderInterface
{
    use LocaleResolveTrait;
    use ProviderResolveTrait;

    public function __construct(
        protected ProviderInterface   $itemProvider,
        protected ProviderInterface   $collectionProvider,
        protected RequestStack        $requestStack,
        protected LocalizationService $localizationService,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $provider = $this->resolveProvider($operation);
        $result   = $provider->provide($operation, $uriVariables, $context);
        $locale   = $this->resolveLocale();

        if ($operation instanceof GetCollection) {
            foreach ($result as $entity) {
                if ($this->supports($entity)) {
                    $this->localize($entity, $locale);
                }
            }
            return $result;
        }

        if ($result !== null && $this->supports($result)) {
            $this->localize($result, $locale);
        }

        return $result;
    }

    abstract protected function supports(object $entity): bool;

    abstract protected function localize(object $entity, string $locale): void;
}
