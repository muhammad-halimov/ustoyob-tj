<?php

namespace App\State\Localization;

use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

abstract readonly class AbstractLocalizationProvider implements ProviderInterface
{
    public function __construct(
        protected ProviderInterface   $itemProvider,
        protected ProviderInterface   $collectionProvider,
        protected RequestStack        $requestStack,
        protected LocalizationService $localizationService,
    ) {}

    private function getLocale(RequestStack $requestStack): string
    {
        $request = $requestStack->getCurrentRequest();
        $locale  = $request?->query->get('locale', 'tj') ?? 'tj';

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        return $locale;
    }

    private function resolveProvider(Operation $operation): ProviderInterface {
        return $operation instanceof GetCollection ? $this->collectionProvider : $this->itemProvider;
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $provider = $this->resolveProvider($operation);
        $result   = $provider->provide($operation, $uriVariables, $context);
        $locale   = $this->getLocale($this->requestStack);

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
