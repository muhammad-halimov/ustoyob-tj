<?php

namespace App\State\Localization\Geography;

use App\Entity\Ticket\Ticket;
use App\State\Localization\AbstractLocalizationProvider;

readonly class TicketGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Ticket;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Ticket $entity */
        $this->localizationService->localizeGeography($entity, $locale);

        if ($entity->getCategory()) {
            $this->localizationService->localizeEntity($entity->getCategory(), $locale);
        }

        if ($entity->getUnit()) {
            $this->localizationService->localizeEntity($entity->getUnit(), $locale);
        }

        if ($entity->getSubcategory()) {
            $this->localizationService->localizeEntity($entity->getSubcategory(), $locale);
        }
    }
}
