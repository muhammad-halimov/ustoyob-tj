<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Extra\Translation;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class UserGeographyLocalizationProvider implements ProviderInterface
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

        // Применяем локализацию к результату
        foreach ($result as $entity) {
            if ($entity instanceof User) {
                $this->localizationService->localizeGeography($entity, $locale);

                foreach ($entity->getOccupation() as $occupation) {
                    $this->localizationService->localizeEntity($occupation, $locale);
                }
            }
        }

        return $result;
    }
}
