<?php

namespace App\Service\Extra;

use Doctrine\Common\Collections\Collection;

class LocalizationService
{
    public function localizeGeography(object $entity, string $locale): void
    {
        if (!method_exists($entity, 'getAddresses')) {
            return;
        }

        foreach ($entity->getAddresses() as $address) {

            // Province
            if ($province = $address->getProvince()) {
                $this->localizeEntity($province, $locale);
            }

            // City
            if ($city = $address->getCity()) {
                $this->localizeEntity($city, $locale);
            }

            // Suburb
            if ($suburb = $address->getSuburb()) {
                $this->localizeEntity($suburb, $locale);
            }

            // District
            if ($district = $address->getDistrict()) {
                $this->localizeEntity($district, $locale);

                // Settlements
                foreach ($district->getSettlements() as $settlement) {
                    $this->localizeEntity($settlement, $locale);

                    // Villages
                    foreach ($settlement->getVillages() as $village) {
                        $this->localizeEntity($village, $locale);
                    }
                }

                // Communities
                foreach ($district->getCommunities() as $community) {
                    $this->localizeEntity($community, $locale);
                }
            }

            // Settlement (direct)
            if ($settlement = $address->getSettlement()) {
                $this->localizeEntity($settlement, $locale);
            }

            // Community (direct)
            if ($community = $address->getCommunity()) {
                $this->localizeEntity($community, $locale);
            }

            // Village (direct)
            if ($village = $address->getVillage()) {
                $this->localizeEntity($village, $locale);
            }
        }
    }

    /**
     * Безопасная локализация:
     * - нет ?-> на first()
     * - нет fatal error
     */
    public function localizeEntity(object $entity, string $locale): void
    {
        if (!$entity) return;

        if (!method_exists($entity, 'getTranslations') || !method_exists($entity, 'setTitle')) {
            return;
        }

        /** @var Collection $translations */
        $translations = $entity->getTranslations();

        $translation = $translations
            ->filter(fn ($t) => $t->getLocale() === $locale)
            ->first();

        $fallback = $translations->first();

        $title =
            ($translation && method_exists($translation, 'getTitle'))
                ? $translation->getTitle()
                : ($fallback && method_exists($fallback, 'getTitle')
                ? $fallback->getTitle()
                : 'Unknown'
            );

        $entity->setTitle($title);
    }
}
