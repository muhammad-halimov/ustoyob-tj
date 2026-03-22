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

        /** @var Favorite $entry */
        foreach ($collection as $entry) {
            if ($ticket = $entry->getTicket()) {
                $this->localizationService->localizeGeography($ticket, $locale);

                if ($ticket->getCategory())
                    $this->localizationService->localizeEntity($ticket->getCategory(), $locale);

                if ($ticket->getUnit())
                    $this->localizationService->localizeEntity($ticket->getUnit(), $locale);

                if ($ticket->getSubcategory())
                    $this->localizationService->localizeEntity($ticket->getSubcategory(), $locale);
            }

            if ($user = $entry->getUser()) {
                foreach ($user->getOccupation() as $occupation)
                    $this->localizationService->localizeEntity($occupation, $locale);
            }
        }

        return $collection;
    }
}
