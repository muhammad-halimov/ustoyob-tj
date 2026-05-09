<?php

namespace App\Controller\Api\CRUD\POST\Chat\Chat;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Repository\Chat\ChatMessageRepository;
use App\Repository\Chat\ChatRepository;
use DateTimeImmutable;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * POST /api/chats/{id}/read
 *
 * Помечает все непрочитанные сообщения чата как прочитанные для текущего пользователя.
 * "Непрочитанное" = сообщение отправлено собеседником (author != bearer) и readAt === null.
 *
 * ПОЧЕМУ НЕ DQL UPDATE:
 * Мы намеренно загружаем сущности через Unit of Work, а не делаем bulk-UPDATE через DQL.
 * Bulk-UPDATE обходит Doctrine Lifecycle Events → postUpdate не срабатывает →
 * ChatMessageListener не публикует SSE → отправитель не видит вторую галочку.
 * Загрузка + цикл + flush гарантирует, что каждый ChatMessage пройдёт через postUpdate
 * и Mercure доставит событие "updated" на топик "chat:{id}".
 */
class ApiPostMarkChatReadController extends AbstractApiHelperController
{
    public function __construct(
        private readonly ChatRepository        $chatRepository,
        private readonly ChatMessageRepository $chatMessageRepository,
    ) {}

    public function __invoke(int $id): JsonResponse
    {
        $bearer = $this->checkedUser();

        $chat = $this->chatRepository->find($id);

        if (!$chat)
            return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

        if ($chat->getAuthor() !== $bearer && $chat->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $unread = $this->chatMessageRepository->findUnreadByRecipient($chat, $bearer);

        $now = new DateTimeImmutable();

        foreach ($unread as $message) {
            $message->setReadAt($now);
        }

        $this->flush();

        return $this->json(null, 204);
    }
}
