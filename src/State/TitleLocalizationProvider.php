<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\User\Occupation;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class TitleLocalizationProvider implements ProviderInterface
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
            if ($entity instanceof Category || $entity instanceof Occupation) {
                $this->localizationService->localizeEntity($entity, $locale);
            }

            if ($entity instanceof Occupation) {
                foreach ($entity->getCategories() as $category)
                    $this->localizationService->localizeEntity($category, $locale);
            } elseif ($entity instanceof Category && $entity->getOccupations() !== null) {
                $this->localizationService->localizeEntity($entity->getOccupations(), $locale);
            }
        }

        return $result;
    }
}
