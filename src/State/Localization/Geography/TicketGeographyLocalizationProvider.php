<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Ticket;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class TicketGeographyLocalizationProvider implements ProviderInterface
{
    public function __construct(
        private ProviderInterface $decorated,
        private RequestStack $requestStack,
        private LocalizationService $localizationService,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // Получаем данные от стандартного провайдера (с применением всех фильтров)
        $result = $this->decorated->provide($operation, $uriVariables, $context);

        $request = $this->requestStack->getCurrentRequest();
        $locale = $request?->query->get('locale', 'tj') ?? 'tj';

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        // Проверяем, это массив с одним элементом или коллекция
        $isSingleWrappedInArray = is_array($result) && count($result) === 1 && isset($result[0]) && $result[0] instanceof Ticket;

        // Применяем локализацию к результату
        foreach ($result as $entity) {
            if ($entity instanceof Ticket) {
                $this->localizationService->localizeGeography($entity, $locale);

                if ($entity->getCategory())
                    $this->localizationService->localizeEntity($entity->getCategory(), $locale);

                if ($entity->getUnit())
                    $this->localizationService->localizeEntity($entity->getUnit(), $locale);

                if ($entity->getSubcategory())
                    $this->localizationService->localizeEntity($entity->getSubcategory(), $locale);
            }
        }

        return $isSingleWrappedInArray ? $result[0] : $result;
    }
}
