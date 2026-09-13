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
        // localizeEntityFull() — description гео-справочников тоже per-locale
        // теперь (см. докблок LocalizationService::localizeGeography()).
        $this->localizationService->localizeEntityFull($entity, $locale);

        if ($entity->getProvince()) {
            $this->localizationService->localizeEntityFull($entity->getProvince(), $locale);
        }

        foreach ($entity->getSettlements() as $settlement) {
            $this->localizationService->localizeEntityFull($settlement, $locale);

            foreach ($settlement->getVillages() as $village) {
                $this->localizationService->localizeEntityFull($village, $locale);
            }
        }

        foreach ($entity->getCommunities() as $community) {
            $this->localizationService->localizeEntityFull($community, $locale);
        }
    }
}
