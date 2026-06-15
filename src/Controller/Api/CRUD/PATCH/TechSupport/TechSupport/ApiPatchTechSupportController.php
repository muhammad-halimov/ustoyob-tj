<?php

namespace App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\TechSupport\TechSupportInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchTechSupportController extends AbstractApiPatchController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    protected function getUserGrade(): string { return 'double'; }

    protected function getNotFoundError(): string { return AppMessages::TECH_SUPPORT_NOT_FOUND; }

    protected function getInputClass(): string { return TechSupportInput::class; }

    protected function getEntityById(int $id): ?object
    {
        return $this->techSupportRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor() !== $bearer && $entity->getAdministrant() !== $bearer)
            return $this->errorJson(AppMessages::EXTRA_DENIED);

        return null;
    }

    /**
     * Таблица допустимых переходов статуса (машина состояний).
     *
     * Формат: [текущий статус => [новый статус => 'кто может перевести']]
     *   'admin'  — только ROLE_ADMIN
     *   'author' — только автор тикета (пользователь, который его создал)
     *
     * Переходы:
     *   new         → in_progress (админ берёт в работу)
     *   new         → closed      (админ закрывает без ответа)
     *   renewed     → in_progress (админ взял повторно открытый тикет)
     *   renewed     → closed      (админ закрывает)
     *   in_progress → resolved    (админ отмечает как решённое)
     *   in_progress → closed      (админ закрывает)
     *   resolved    → renewed     (автор не согласен — переоткрывает тикет)
     *   resolved    → closed      (админ закрывает)
     *   closed      → (нет, терминальный статус)
     */
    private const array TRANSITIONS = [
        'new'         => ['in_progress' => 'admin', 'closed' => 'admin'],
        'renewed'     => ['in_progress' => 'admin', 'closed' => 'admin'],
        'in_progress' => ['resolved'    => 'admin', 'closed' => 'admin'],
        'resolved'    => ['renewed'     => 'author', 'closed' => 'admin'],
    ];

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupport $entity */
        /** @var TechSupportInput $dto */
        $newStatus = $dto->status;

        // Сначала проверяем, что новый статус вообще существует в системе.
        if (!$newStatus || !in_array($newStatus, array_values(TechSupport::STATUSES), true))
            return $this->errorJson(AppMessages::WRONG_TECH_SUPPORT_STATUS);

        // Смотрим, допустимый ли переход из текущего статуса в новый.
        // Если текущего статуса нет в таблице (например, 'closed') — переходов нет.
        $allowed = self::TRANSITIONS[$entity->getStatus()] ?? [];

        if (!isset($allowed[$newStatus]))
            return $this->errorJson(AppMessages::WRONG_TECH_SUPPORT_STATUS);

        $isAdmin  = in_array('ROLE_ADMIN', $bearer->getRoles(), true);
        $isAuthor = $entity->getAuthor() === $bearer;

        // Проверяем, есть ли у пользователя право на этот конкретный переход.
        if ($allowed[$newStatus] === 'admin'  && !$isAdmin)  return $this->errorJson(AppMessages::EXTRA_DENIED);
        if ($allowed[$newStatus] === 'author' && !$isAuthor) return $this->errorJson(AppMessages::EXTRA_DENIED);

        $entity->setStatus($newStatus);

        return null;
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getAdministrant()) $this->localizationService->localizeUser($entity->getAdministrant(), $this->getLocale());
        if ($entity->getReason()) $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());
    }
}
