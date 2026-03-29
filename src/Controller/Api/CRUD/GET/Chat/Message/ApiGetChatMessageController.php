<?php

namespace App\Controller\Api\CRUD\GET\Chat\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiGetController;
use App\Entity\Chat\ChatMessage;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiGetChatMessageController extends AbstractApiGetController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getEntityClass(): string { return ChatMessage::class; }

    protected function setSerializationGroups(): array { return G::OPS_CHAT_MSGS; }

    protected function buildResponse(object|array $entity): JsonResponse
    {
        /** @var ChatMessage $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        return parent::buildResponse($entity);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        $chat = $entity->getChat();

        if (!$chat) return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

        if ($chat->getAuthor() !== $bearer && $chat->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }
}
