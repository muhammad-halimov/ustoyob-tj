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
        $this->localizationService->localizeEntity($entity, $locale);

        foreach ($entity->getCities() as $city) {
            $this->localizationService->localizeEntity($city, $locale);

            foreach ($city->getSuburbs() as $suburb) {
                $this->localizationService->localizeEntity($suburb, $locale);
            }
        }

        foreach ($entity->getDistricts() as $district) {
            $this->localizationService->localizeEntity($district, $locale);

            foreach ($district->getSettlements() as $settlement) {
                $this->localizationService->localizeEntity($settlement, $locale);

                foreach ($settlement->getVillages() as $village) {
                    $this->localizationService->localizeEntity($village, $locale);
                }
            }

            foreach ($district->getCommunities() as $community) {
                $this->localizationService->localizeEntity($community, $locale);
            }
        }
    }
}
