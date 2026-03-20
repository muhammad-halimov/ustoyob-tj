<?php

namespace App\State\Localization\Title;

use App\Entity\Legal\Legal;
use App\State\Localization\AbstractLocalizationProvider;

readonly class LegalLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Legal;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Legal $entity */
        $this->localizationService->localizeEntityFull($entity, $locale);
    }
}
