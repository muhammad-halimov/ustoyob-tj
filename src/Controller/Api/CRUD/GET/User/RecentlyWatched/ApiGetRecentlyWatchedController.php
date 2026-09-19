<?php

namespace App\Controller\Api\CRUD\GET\User\RecentlyWatched;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Entity\User\RecentlyWatched;
use App\Repository\User\RecentlyWatchedRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

/**
 * GET /recently-watched — недавно просмотренные тикеты ТЕКУЩЕГО пользователя
 * (владелец берётся из Bearer-токена, чужую ленту запросить нельзя), новые
 * сверху. Пагинация — ?page=&itemsPerPage= (см. AbstractApiGetCollectionController).
 * Пустая лента — 404 resource_not_found, как у остальных self-коллекций
 * (/chats/me, /tickets/me): единое поведение AbstractApiGetCollectionController.
 */
class ApiGetRecentlyWatchedController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly RecentlyWatchedRepository $repository,
        private readonly LocalizationService       $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_RECENTLY_WATCHED; }

    protected function getUserGrade(): string { return 'triple'; }

    protected function fetchQuery(User $user): QueryBuilder
    {
        return $this->repository->queryVisibleByOwner($user);
    }

    protected function afterFetch(array|object $entity, ?User $user): void
    {
        /** @var RecentlyWatched $entry */
        foreach ($entity as $entry) {
            $this->localizationService->localizeTicket($entry->getTicket(), $this->getLocale());
        }
    }
}
