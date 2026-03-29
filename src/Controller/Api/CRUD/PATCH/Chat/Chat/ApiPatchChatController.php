<?php

namespace App\Controller\Api\CRUD\PATCH\Chat\Chat;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\Chat\ChatPatchInput;
use App\Entity\Chat\Chat;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchChatController extends AbstractApiPatchController
{
    protected function getEntityClass(): string { return Chat::class; }

    protected function getInputClass(): string { return ChatPatchInput::class; }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var Chat $entity */
        if ($entity->getAuthor() !== $bearer && $entity->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var Chat $entity */
        /** @var ChatPatchInput $dto */
        $this->accessService->checkBlackList($entity->getAuthor(), $entity->getReplyAuthor());
        $entity->setActive($dto->active);

        return null;
    }
}
