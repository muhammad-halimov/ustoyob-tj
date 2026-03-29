<?php

namespace App\Controller\Api\CRUD\DELETE\TechSupport\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiDeleteController;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiDeleteTechSupportMessageController extends AbstractApiDeleteController
{
    protected function getEntityClass(): string
    {
        return TechSupportMessage::class;
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupportMessage $entity */
        if ($entity->getAuthor() !== $bearer) return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }
}
