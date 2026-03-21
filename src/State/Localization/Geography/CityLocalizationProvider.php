<?php

namespace App\State\Localization\Geography;

use App\Entity\Geography\City\City;
use App\State\Localization\AbstractLocalizationProvider;

readonly class CityLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof City;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var City $entity */
        $this->localizationService->localizeEntity($entity, $locale);

        if ($entity->getProvince()) {
            $this->localizationService->localizeEntity($entity->getProvince(), $locale);
        }

        foreach ($entity->getSuburbs() as $suburb) {
            $this->localizationService->localizeEntity($suburb, $locale);
        }
    }
}
