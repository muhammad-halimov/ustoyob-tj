<?php

namespace App\Controller\Api\CRUD\PATCH\TechSupport\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\TechSupport\TechSupportMessagePatchInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchTechSupportMessageController extends AbstractApiPatchController
{
    private ?TechSupport $techSupport = null;

    protected function getInputClass(): string { return TechSupportMessagePatchInput::class; }

    protected function getEntityById(int $id): ?object
    {
        /** @var TechSupportMessagePatchInput $dto */
        $dto               = $this->inputDto;
        $this->techSupport = $dto->techSupport;

        return $this->entityManager->find(TechSupportMessage::class, $id);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        if (!$this->techSupport) return $this->errorJson(AppMessages::TECH_SUPPORT_NOT_FOUND);

        if ($this->techSupport->getAdministrant() !== $bearer && $this->techSupport->getAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupportMessage $entity */
        /** @var TechSupportMessagePatchInput $dto */
        $text = $dto->description;

        if (!$text) return $this->errorJson(AppMessages::EMPTY_TEXT);

        $entity->setDescription($text)->setTechSupport($this->techSupport)->setAuthor($bearer);
        $this->techSupport->addTechSupportMessage($entity);

        return null;
    }

    protected function buildResponse(object|array $entity): JsonResponse
    {
        /** @var TechSupportMessage $entity */
        return $this->json([
            'techSupport' => ['id' => $this->techSupport->getId()],
            'message'     => ['id' => $entity->getId()],
        ]);
    }
}
