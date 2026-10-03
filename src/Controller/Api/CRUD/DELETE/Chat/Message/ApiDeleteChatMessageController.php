<?php

namespace App\Controller\Api\CRUD\DELETE\Chat\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Chat\ChatMessage;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * DELETE /api/chat-messages/{id} — мягкое удаление, не физическое
 * (пустое — без текста и фото — физическое, см. deleteMessage()).
 *
 * Раньше был безусловный физический remove() (AbstractApiDeleteController) —
 * теперь та же механика, что у TechSupportMessage (см.
 * AbstractApiHelperController::softDeleteMessage()): описание заменяется на
 * плейсхолдер, фото убираются, строка остаётся. Отдельно от PATCH и не
 * подчиняется его ограничениям (24ч и т.д.) — сценарий другой: убрать
 * случайно введённые чувствительные данные, это должно быть можно в любой
 * момент.
 *
 * Автор ИЛИ любой ROLE_ADMIN (модерация переписки) — чат сам по себе не
 * имеет роли "администратора", в отличие от TechSupport, поэтому это чистое
 * право модерации, не привязанное к конкретному чату.
 */
class ApiDeleteChatMessageController extends AbstractApiHelperController
{
    public function __invoke(string $id): JsonResponse
    {
        $bearer = $this->checkedUser();

        /** @var ?ChatMessage $message */
        $message = $this->entityManager->find(ChatMessage::class, $id);
        if (!$message) return $this->errorJson(AppMessages::CHAT_MESSAGE_NOT_FOUND);

        $isAdmin = in_array('ROLE_ADMIN', $bearer->getRoles(), true);
        if (!$isAdmin && $message->getAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $this->deleteMessage($message, $bearer);
        $this->flush();

        return $this->json(null, 204);
    }
}
