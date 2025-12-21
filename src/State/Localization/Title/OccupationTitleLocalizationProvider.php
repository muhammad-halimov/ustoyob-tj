<?php

namespace App\State\Localization\Title;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Entity\User\Occupation;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class OccupationTitleLocalizationProvider implements ProviderInterface
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
            if ($entity instanceof Occupation) {
                $this->localizationService->localizeEntity($entity, $locale);

                foreach ($entity->getCategories() as $category)
                    $this->localizationService->localizeEntity($category, $locale);
            }
        }

        return $result;
    }
}
