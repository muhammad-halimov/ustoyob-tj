<?php

namespace App\State\CollectionEntry;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\User\Favorite;
use App\Service\Extra\AccessService;
use App\Service\Extra\LocalizationService;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

readonly class FavoriteStateProvider extends AbstractCollectionEntryStateProvider
{
    public function __construct(
        ProviderInterface               $collectionProvider,
        AccessService                   $accessService,
        Security                        $security,
        private LocalizationService     $localizationService,
        private RequestStack            $requestStack,
    ) {
        parent::__construct($collectionProvider, $accessService, $security);
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|null|array
    {
        $collection = parent::provide($operation, $uriVariables, $context);

        $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
        $result = [];

        // Видимость (approved-тикет / active+approved-юзер) теперь фильтруется
        // на уровне SQL в FavoriteVisibilityExtension — до применения LIMIT/OFFSET,
        // поэтому здесь остаётся только локализация уже гарантированно видимых записей.
        /** @var Favorite $entry */
        foreach ($collection as $entry) {
            if ($ticket = $entry->getTicket()) {
                $this->localizationService->localizeGeography($ticket, $locale);

                // localizeEntityFull() — та же причина, что в
                // LocalizationService::localizeTicket() (см. её докблок):
                // Category::description теперь per-locale, а не localizeEntity()
                // просто оставил бы значение по умолчанию из фикстуры.
                if ($ticket->getCategory())
                    $this->localizationService->localizeEntityFull($ticket->getCategory(), $locale);

                // localizeEntityFull() — БАГФИКС (13.09.2026): Unit::description
                // per-locale (см. докблок UnitTitleLocalizationProvider).
                if ($ticket->getUnit())
                    $this->localizationService->localizeEntityFull($ticket->getUnit(), $locale);

                // localizeEntityFull() — Occupation::description тоже
                // per-locale, см. докблок OccupationTitleLocalizationProvider.
                if ($ticket->getSubcategory())
                    $this->localizationService->localizeEntityFull($ticket->getSubcategory(), $locale);
            }

            if ($user = $entry->getUser()) {
                foreach ($user->getOccupation() as $occupation)
                    $this->localizationService->localizeEntityFull($occupation, $locale);
            }

            $result[] = $entry;
        }

        return $result;
    }
}
