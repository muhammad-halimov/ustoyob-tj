<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use App\Entity\User;
use App\State\Localization\AbstractLocalizationProvider;

readonly class UserGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    /**
     * Для одиночного GET /users/{id} — тот же критерий видимости
     * (active = true AND approved = true), что UserVisibilityExtension
     * применяет к коллекции GET /users, иначе профиль деактивированного/
     * неподтверждённого пользователя оставался бы доступен по прямой ссылке.
     *
     * GET /users/me через этот provider не проходит — у него свой
     * контроллер (ApiGetMyProfileController), поэтому self-доступ не задет.
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof Get) {
            $user = $this->itemProvider->provide($operation, $uriVariables, $context);

            if (!$user instanceof User || !$user->getActive() || !$user->getApproved()) {
                return null;
            }

            // resolveLocale() из LocaleResolveTrait объявлен private в
            // AbstractLocalizationProvider — из класса-наследника недоступен,
            // поэтому резолвим локаль так же, как TicketGeographyLocalizationProvider.
            $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
            $this->localize($user, $locale);

            return $user;
        }

        return parent::provide($operation, $uriVariables, $context);
    }

    protected function supports(object $entity): bool
    {
        return $entity instanceof User;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var User $entity */
        $this->localizationService->localizeGeography($entity, $locale);

        // localizeEntityFull() — Occupation::description тоже per-locale,
        // см. докблок OccupationTitleLocalizationProvider.
        foreach ($entity->getOccupation() as $occupation) {
            $this->localizationService->localizeEntityFull($occupation, $locale);
        }

        foreach ($entity->getEducation() as $education) {
            $occupation = $education->getOccupation();
            if ($occupation !== null) $this->localizationService->localizeEntityFull($occupation, $locale);
        }
    }
}
