<?php

namespace App\State\Localization\Appeal;

use App\Entity\Appeal\Appeal\Appeal;
use App\State\Localization\AbstractLocalizationProvider;

readonly class AppealLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Appeal;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Appeal $entity */
        $this->localizationService->localizeAppeal($entity, $locale);
    }
}
