<?php

namespace App\Controller\Api\CRUD\DELETE\Chat\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\ChatMessage;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteChatMessageController extends AbstractApiController
{
    public function __invoke(int $id): JsonResponse
    {
        /** @var ChatMessage $chatMessage */
        $chatMessage = $this->findOr404(ChatMessage::class, $id);

        if ($chatMessage instanceof JsonResponse)
            return $chatMessage;

        if ($chatMessage->getAuthor() !== $this->checkedUser())
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        return $this->removeAndRespond($chatMessage);
    }
}
