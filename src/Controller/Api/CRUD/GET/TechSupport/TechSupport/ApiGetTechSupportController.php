<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiGetController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * GET /tech-supports/{id} — получить один тикет по ID.
 *
 * Доступ:
 *   — автор тикета (пользователь, который его создал)
 *   — администрант (поддержка, назначенная на этот тикет)
 *   — ROLE_ADMIN (администратор сайта — видит любой тикет)
 *
 * Раньше этого endpoint не существовало — можно было получить только коллекцию.
 */
class ApiGetTechSupportController extends AbstractApiGetController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getEntityClass(): string { return TechSupport::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupport $entity */
        $isAdmin = in_array('ROLE_ADMIN', $bearer->getRoles(), true);

        // ROLE_ADMIN видит любой тикет. Обычный пользователь — только свой.
        if (!$isAdmin && $entity->getAuthor() !== $bearer && $entity->getAdministrant() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

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
