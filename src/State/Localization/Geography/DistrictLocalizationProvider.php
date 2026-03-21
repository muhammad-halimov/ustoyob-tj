<?php

namespace App\State\Localization\Geography;

use App\Entity\Geography\District\District;
use App\State\Localization\AbstractLocalizationProvider;

readonly class DistrictLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof District;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var District $entity */
        $this->localizationService->localizeEntity($entity, $locale);

        if ($entity->getProvince()) {
            $this->localizationService->localizeEntity($entity->getProvince(), $locale);
        }

        foreach ($entity->getSettlements() as $settlement) {
            $this->localizationService->localizeEntity($settlement, $locale);

            foreach ($settlement->getVillages() as $village) {
                $this->localizationService->localizeEntity($village, $locale);
            }
        }

        foreach ($entity->getCommunities() as $community) {
            $this->localizationService->localizeEntity($community, $locale);
        }
    }
}
