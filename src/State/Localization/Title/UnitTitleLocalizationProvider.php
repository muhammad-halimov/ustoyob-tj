<?php

namespace App\State\Localization\Title;

use App\Entity\Ticket\Unit;
use App\State\Localization\AbstractLocalizationProvider;

readonly class UnitTitleLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Unit;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Unit $entity */
        $this->localizationService->localizeEntity($entity, $locale);
    }
}
