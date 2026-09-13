<?php

namespace App\State\Localization\Title;

use App\Entity\Ticket\Category;
use App\State\Localization\AbstractLocalizationProvider;

readonly class CategoryTitleLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Category;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Category $entity */
        // localizeEntityFull() (не localizeEntity()) — БАГФИКС (13.09.2026):
        // раньше Category::$description не был per-locale вообще — фикстуры
        // просто склеивали все 3 языка в одну строку через \n (см. старый
        // CategoryFixture), и отдавался этот "трёхъязычный винегрет" любому
        // клиенту независимо от ?locale=. Теперь description лежит в
        // Translation (как title), и localizeEntityFull() резолвит и title,
        // и description по текущей локали — тот же паттерн, что уже
        // применяется к Legal (см. LegalLocalizationProvider).
        $this->localizationService->localizeEntityFull($entity, $locale);

        foreach ($entity->getOccupations() as $occupation) {
            // localizeEntityFull() — та же причина, что выше у самой
            // Category: Occupation::description тоже теперь per-locale
            // (см. OccupationTitleLocalizationProvider).
            $this->localizationService->localizeEntityFull($occupation, $locale);
        }
    }
}
