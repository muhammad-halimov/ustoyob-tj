<?php

namespace App\Controller\Api\CRUD\PATCH\Chat\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\Chat;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatController extends AbstractApiController
{

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        /** @var Chat $chat */
        $chat = $this->findOr404(Chat::class, $id);

        if ($chat instanceof JsonResponse)
            return $chat;

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chat->setActive((bool)$this->getContent()['active']);

        $this->flush();

        return $this->json(['message' => "Resource updated successfully"]);
    }
}
