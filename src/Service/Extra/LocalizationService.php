<?php

namespace App\Service\Extra;

use Doctrine\Common\Collections\Collection;

class LocalizationService
{
    /**
     * @param object $entity
     * @param string $locale
     * @return void
     */
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

    public function localizeEntityFull(object $entity, string $locale): void
    {
        if (!$entity) return;

        if (!method_exists($entity, 'getTranslations')) {
            return;
        }

        /** @var Collection $translations */
        $translations = $entity->getTranslations();

        $translation = $translations->filter(fn($t) => $t->getLocale() === $locale)->first();
        $fallback    = $translations->first();
        $resolved    = $translation ?: $fallback;

        if (method_exists($entity, 'setTitle') && $resolved && method_exists($resolved, 'getTitle')) {
            $entity->setTitle($resolved->getTitle());
        }

        if (method_exists($entity, 'setDescription') && $resolved && method_exists($resolved, 'getDescription')) {
            $desc = $resolved->getDescription();
            if ($desc !== null) {
                $entity->setDescription($desc);
            }
        }
    }

    /**
     * @param object $entity
     * @param string $locale
     * @return string
     */
    public function getLocalizedTitle(object $entity, string $locale): string
    {
        $translation = $entity->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();

        if ($translation) {
            return $translation->getTitle();
        }

        $fallback = $entity->getTranslations()->first();
        return $fallback ? $fallback->getTitle() : 'Unknown';
    }
}
