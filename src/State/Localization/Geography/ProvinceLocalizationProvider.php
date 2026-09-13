<?php

namespace App\State\Localization\Geography;

use App\Entity\Geography\Province\Province;
use App\State\Localization\AbstractLocalizationProvider;

readonly class ProvinceLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Province;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Province $entity */
        // localizeEntityFull() — description гео-справочников тоже per-locale
        // теперь (см. докблок LocalizationService::localizeGeography()).
        $this->localizationService->localizeEntityFull($entity, $locale);

        foreach ($entity->getCities() as $city) {
            $this->localizationService->localizeEntityFull($city, $locale);

            foreach ($city->getSuburbs() as $suburb) {
                $this->localizationService->localizeEntityFull($suburb, $locale);
            }
        }

        foreach ($entity->getDistricts() as $district) {
            $this->localizationService->localizeEntityFull($district, $locale);

            foreach ($district->getSettlements() as $settlement) {
                $this->localizationService->localizeEntityFull($settlement, $locale);

                foreach ($settlement->getVillages() as $village) {
                    $this->localizationService->localizeEntityFull($village, $locale);
                }
            }

            foreach ($district->getCommunities() as $community) {
                $this->localizationService->localizeEntityFull($community, $locale);
            }
        }
    }
}
