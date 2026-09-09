<?php

namespace App\Controller\Api\CRUD\GET\Chat\Chat;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Chat\Chat;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

class ApiGetMyChatsController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly ChatRepository        $chatRepository,
        private readonly ChatMessageRepository $chatMessageRepository,
        private readonly LocalizationService   $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_CHATS; }

    protected function fetchQuery(User $user): QueryBuilder
    {
        $query = $this->requestStack->getCurrentRequest()?->query;

        // is_numeric()+(int) убраны (06.09.2026, переход на UUID-PK) —
        // Ticket::$id теперь UUID-строка, а не число: is_numeric() на
        // реальном UUID всегда false (там есть дефисы и буквы) — ?ticket=
        // фильтр тихо переставал бы работать вообще, ВСЕГДА давая null.
        $ticketId = ($v = $query?->get('ticket')) !== null && $v !== '' ? $v : null;
        $active   = ($v = $query?->get('active'))  !== null ? filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
        // ?user= — чаты с конкретным собеседником (общий + тикет-скоуп разом),
        // см. докблок ChatRepository::findUserChats(). Тот же паттерн, что и
        // у $ticketId выше — просто строка с UUID, без is_numeric()/(int).
        $userId   = ($v = $query?->get('user'))    !== null && $v !== '' ? $v : null;

        return $this->chatRepository->findUserChats($user, $ticketId, $active, $userId);
    }

    protected function afterFetch(array|object $entity, ?User $user): void
    {
        /** @var Chat $chat */
        foreach ($entity as $chat) {
            if ($chat->getAuthor()) $this->localizationService->localizeUser($chat->getAuthor(), $this->getLocale());
            if ($chat->getReplyAuthor()) $this->localizationService->localizeUser($chat->getReplyAuthor(), $this->getLocale());

            // Превью последнего сообщения + бейдж непрочитанных — раньше это
            // фронт считал сам из Chat.messages (поле убрали, см. Chat::
            // $lastMessage/$unreadCount), теперь считаем здесь: узкий (LIMIT 1
            // / COUNT) запрос на чат, а не выгрузка всех сообщений разом.
            $chat->setLastMessage($this->chatMessageRepository->findLastMessage($chat));
            $chat->setUnreadCount($this->chatMessageRepository->countUnread($chat, $user));
        }
    }
}
