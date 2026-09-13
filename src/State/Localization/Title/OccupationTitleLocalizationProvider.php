<?php

namespace App\State\Localization\Title;

use App\Entity\User\Occupation;
use App\State\Localization\AbstractLocalizationProvider;

readonly class OccupationTitleLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Occupation;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Occupation $entity */
        // localizeEntityFull() (не localizeEntity()) — БАГФИКС (13.09.2026):
        // Occupation::description теперь per-locale, как у Category (тот
        // же паттерн через Translation) — localizeEntity() резолвил бы
        // только title, оставляя description значением по умолчанию из
        // фикстуры независимо от ?locale=.
        $this->localizationService->localizeEntityFull($entity, $locale);

        if ($category = $entity->getCategory()) {
            // localizeEntityFull() — та же причина, что в
            // CategoryTitleLocalizationProvider (см. её докблок):
            // Category::description теперь per-locale, а не localizeEntity()
            // оставил бы значение по умолчанию из фикстуры независимо от
            // ?locale= текущего запроса.
            $this->localizationService->localizeEntityFull($category, $locale);
        }
    }
}
