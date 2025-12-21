<?php

namespace App\State\Localization\Title;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Unit;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class UnitTitleLocalizationProvider implements ProviderInterface
{
    public function __construct(
        private ProviderInterface $decorated,
        private RequestStack $requestStack,
        private LocalizationService $localizationService,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $result = $this->decorated->provide($operation, $uriVariables, $context);

        $request = $this->requestStack->getCurrentRequest();
        $locale = $request?->query->get('locale', 'tj') ?? 'tj';

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        foreach ($result as $entity) {
            if ($entity instanceof Unit) {
                $this->localizationService->localizeEntity($entity, $locale);
            }
        }

        return $result;
    }
}
