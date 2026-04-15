<?php

namespace App\State\Localization\Review;

use App\Entity\Review\Review;
use App\State\Localization\AbstractLocalizationProvider;

readonly class ReviewLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof Review;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Review $entity */
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $locale);
        if ($entity->getClient()) $this->localizationService->localizeUser($entity->getClient(), $locale);
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $locale);
    }
}
