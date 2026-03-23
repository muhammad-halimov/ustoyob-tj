<?php

namespace App\State\Localization\Geography;

use App\Entity\User;
use App\State\Localization\AbstractLocalizationProvider;

readonly class UserGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    protected function supports(object $entity): bool
    {
        return $entity instanceof User;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var User $entity */
        $this->localizationService->localizeGeography($entity, $locale);

        foreach ($entity->getOccupation() as $occupation) {
            $this->localizationService->localizeEntity($occupation, $locale);
        }

        foreach ($entity->getEducation() as $education) {
            $occupation = $education->getOccupation();
            if ($occupation !== null) $this->localizationService->localizeEntity($occupation, $locale);
        }
    }
}
