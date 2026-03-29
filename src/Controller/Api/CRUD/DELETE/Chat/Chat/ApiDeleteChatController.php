<?php

namespace App\Controller\Api\CRUD\DELETE\Chat\Chat;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiDeleteController;
use App\Entity\Chat\Chat;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiDeleteChatController extends AbstractApiDeleteController
{
    protected function getEntityClass(): string
    {
        return Chat::class;
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var Chat $entity */
        if ($entity->getAuthor() !== $bearer && $entity->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }
}
