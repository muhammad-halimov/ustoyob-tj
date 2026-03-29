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

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupport $entity */
        /** @var TechSupportInput $dto */
        $statusParam = $dto->status;

        if (!$statusParam || !in_array($statusParam, array_values(TechSupport::STATUSES), true))
            return $this->errorJson(AppMessages::WRONG_TECH_SUPPORT_STATUS);

        if ($statusParam === 'in_progress' && !in_array('ROLE_ADMIN', $bearer->getRoles(), true))
            return $this->errorJson(AppMessages::EXTRA_DENIED);

        $entity->setStatus($statusParam);

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
