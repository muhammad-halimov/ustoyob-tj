<?php

namespace App\Controller\Api\CRUD\GET\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\ChatMessage;
use Symfony\Component\HttpFoundation\JsonResponse;

class ChatMessageFilterController extends AbstractApiController
{

    public function __invoke(int $id): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        /** @var ChatMessage|null $chatMessage */
        $chatMessage = $this->findOr404(ChatMessage::class, $id);

        if ($chatMessage instanceof JsonResponse)
            return $chatMessage;

        $chat = $chatMessage->getChat();

        if (!$chat)
            return $this->errorJson(AppError::CHAT_NOT_FOUND);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
