<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiGetController;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiGetTechSupportMessageController extends AbstractApiGetController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getEntityClass(): string { return TechSupportMessage::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_MSGS; }

    protected function buildResponse(object|array $entity): JsonResponse
    {
        /** @var TechSupportMessage $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        return parent::buildResponse($entity);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupportMessage $entity */
        $chat = $entity->getTechSupport();

        if (!$chat) return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

        if ($chat->getAuthor() !== $bearer && $chat->getAdministrant() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function afterFetch(array|object $entity, User $user): void
    {
        /** @var TechSupportMessage $techSupportMessage */
        foreach ($entity as $techSupportMessage) {
            if ($techSupportMessage->getAuthor())
                $this->localizationService->localizeUser($techSupportMessage->getAuthor(), $this->getLocale());
        }
    }
}
