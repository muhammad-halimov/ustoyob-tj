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
        // localizeEntityFull() (не localizeEntity()) — БАГФИКС (13.09.2026):
        // Unit::$description и так уже был per-locale в UnitFixture (в
        // отличие от старого Category/Occupation), но localizeEntity()
        // резолвит только title — description оставался тем, что записано
        // на самой сущности при фикстуре (русский текст), независимо от
        // ?locale=. localizeEntityFull() резолвит и то, и другое.
        $this->localizationService->localizeEntityFull($entity, $locale);
    }
}
