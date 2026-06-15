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
    // Храним techSupport после checkOwnership — нужен только для buildResponse (возврат ID тикета).
    // Намеренно НЕ берём из тела запроса: раньше здесь был баг — пользователь мог передать
    // чужой techSupportId, пройти ownership-check и редактировать/перемещать чужие сообщения.
    private ?TechSupport $techSupport = null;

    protected function getInputClass(): string { return TechSupportMessagePatchInput::class; }

    protected function getEntityById(int $id): ?object
    {
        // Ищем само сообщение по ID — только из базы, без доверия к данным запроса.
        return $this->entityManager->find(TechSupportMessage::class, $id);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupportMessage $entity */
        // Тикет берём из самой сущности сообщения, а не из тела запроса.
        // Это ключевая проверка безопасности: мы доверяем только тому, что лежит в БД.
        $techSupport = $entity->getTechSupport();

        if (!$techSupport) return $this->errorJson(AppMessages::TECH_SUPPORT_NOT_FOUND);

        // Редактировать сообщение может только автор тикета или его администрант.
        if ($techSupport->getAdministrant() !== $bearer && $techSupport->getAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $this->techSupport = $techSupport;

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupportMessage $entity */
        /** @var TechSupportMessagePatchInput $dto */
        if (!$dto->description) return $this->errorJson(AppMessages::EMPTY_TEXT);

        // Обновляем только текст сообщения.
        // Раньше здесь был баг: вызывался setAuthor($bearer), что перезаписывало
        // оригинального автора сообщения на того, кто его редактирует.
        $entity->setDescription($dto->description);

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
