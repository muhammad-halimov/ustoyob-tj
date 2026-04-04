<?php

namespace App\Controller\Api\CRUD\GET\Chat\Chat;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Chat\Chat;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

class ApiGetMyChatsController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly ChatRepository       $chatRepository,
        private readonly LocalizationService  $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_CHATS; }

    protected function fetchQuery(User $user): QueryBuilder
    {
        $query = $this->requestStack->getCurrentRequest()?->query;

        $ticketId = ($v = $query?->get('ticket')) !== null && is_numeric($v) ? (int) $v : null;
        $active   = ($v = $query?->get('active'))  !== null ? filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        return $this->chatRepository->findUserChats($user, $ticketId, $active);
    }

    protected function afterFetch(array|object $entity, User $user): void
    {
        /** @var Chat $chat */
        foreach ($entity as $chat) {
            if ($chat->getAuthor()) $this->localizationService->localizeUser($chat->getAuthor(), $this->getLocale());
            if ($chat->getReplyAuthor()) $this->localizationService->localizeUser($chat->getReplyAuthor(), $this->getLocale());
        }
    }
}
