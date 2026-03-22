<?php

namespace App\Controller\Api\CRUD\DELETE\Chat\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\Chat;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteChatController extends AbstractApiController
{

    public function __invoke(int $id): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        /** @var Chat $chat */
        $chat = $this->findOr404(Chat::class, $id);

        if ($chat instanceof JsonResponse)
            return $chat;

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        return $this->removeAndRespond($chat);
    }
}
