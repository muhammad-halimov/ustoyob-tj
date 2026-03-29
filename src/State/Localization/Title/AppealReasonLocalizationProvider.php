<?php

namespace App\State\Localization\Title;

use App\Entity\Appeal\Reason\AppealReason;
use App\State\Localization\AbstractLocalizationProvider;

readonly class AppealReasonLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof AppealReason;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var AppealReason $entity */
        $this->localizationService->localizeEntity($entity, $locale);
    }
}
