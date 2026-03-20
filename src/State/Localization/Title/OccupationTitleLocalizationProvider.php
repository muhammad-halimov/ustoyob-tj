<?php

namespace App\State\Localization\Title;

use App\Entity\User\Occupation;
use App\State\Localization\AbstractLocalizationProvider;

readonly class OccupationTitleLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Occupation;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Occupation $entity */
        $this->localizationService->localizeEntity($entity, $locale);

        foreach ($entity->getCategories() as $category) {
            $this->localizationService->localizeEntity($category, $locale);
        }
    }
}
