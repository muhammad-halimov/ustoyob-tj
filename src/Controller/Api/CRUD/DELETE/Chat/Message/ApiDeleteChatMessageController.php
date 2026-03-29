<?php

namespace App\Controller\Api\CRUD\DELETE\Chat\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiDeleteController;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiDeleteChatMessageController extends AbstractApiDeleteController
{
    protected function getEntityClass(): string
    {
        return ChatMessage::class;
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        if ($entity->getAuthor() !== $bearer) return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }
}
