<?php

namespace App\State\Localization\Title;

use App\Entity\Ticket\Category;
use App\State\Localization\AbstractLocalizationProvider;

readonly class CategoryTitleLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Category;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Category $entity */
        $this->localizationService->localizeEntity($entity, $locale);

        if ($entity->getOccupation() !== null) {
            $this->localizationService->localizeEntity($entity->getOccupation(), $locale);
        }
    }
}
