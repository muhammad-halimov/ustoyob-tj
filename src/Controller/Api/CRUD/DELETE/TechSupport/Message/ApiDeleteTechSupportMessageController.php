<?php

namespace App\Controller\Api\CRUD\DELETE\TechSupport\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\TechSupport\TechSupportMessage;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * DELETE /api/tech-support-messages/{id} — мягкое удаление, не физическое
 * (пустое — без текста и фото — физическое, см. deleteMessage()).
 *
 * Отдельно от PATCH (свободная правка текста) — сценарий тут другой: убрать
 * случайно введённые чувствительные данные, а не поправить формулировку.
 * Поэтому не подчиняется ограничениям на редактирование (24ч/реакция
 * оператора) — чувствительные данные должно быть можно убрать в любой
 * момент. Сама механика — общая для ChatMessage/TechSupportMessage, см.
 * AbstractApiHelperController::softDeleteMessage().
 *
 * Автор ИЛИ любой ROLE_ADMIN (модерация) — тот же принцип, что уже
 * используется в ApiPostTechSupportMessageController.checkOwnership()
 * ("любой ROLE_ADMIN может писать в любой тикет, не только назначенный
 * лично на него"). Не требуется быть именно назначенным администрантом.
 */
class ApiDeleteTechSupportMessageController extends AbstractApiHelperController
{
    public function __invoke(string $id): JsonResponse
    {
        $bearer = $this->checkedUser();

        /** @var ?TechSupportMessage $message */
        $message = $this->entityManager->find(TechSupportMessage::class, $id);
        if (!$message) return $this->errorJson(AppMessages::RESOURCE_NOT_FOUND);

        $isAdmin = in_array('ROLE_ADMIN', $bearer->getRoles(), true);
        if (!$isAdmin && $message->getAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $this->deleteMessage($message, $bearer);
        $this->flush();

        return $this->json(null, 204);
    }
}
