<?php

namespace App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\TechSupport\TechSupportAssignInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * PATCH /tech-supports/{id}/assign — назначить администратора на тикет.
 *
 * Доступ: только ROLE_ADMIN.
 * Бонус: если тикет ещё в статусе 'new', автоматически переводится в 'in_progress'.
 * Тело запроса: { "administrant": 42 } — ID пользователя.
 */
class ApiAssignTechSupportController extends AbstractApiPatchController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly LocalizationService   $localizationService,
    ) {}

    protected function getUserGrade(): string { return 'admin'; }

    protected function getInputClass(): string { return TechSupportAssignInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    protected function getNotFoundError(): string { return AppMessages::TECH_SUPPORT_NOT_FOUND; }

    protected function getEntityById(int $id): ?object
    {
        return $this->techSupportRepository->find($id);
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupport $entity */
        /** @var TechSupportAssignInput $dto */
        if (!$dto->administrant) return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $entity->setAdministrant($dto->administrant);

        // Если тикет ещё не был в работе — автоматически запускаем его в процесс.
        if ($entity->getStatus() === 'new') {
            $entity->setStatus('in_progress');
        }

        return null;
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getAdministrant()) $this->localizationService->localizeUser($entity->getAdministrant(), $this->getLocale());
    }
}
