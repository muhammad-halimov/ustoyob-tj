<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetSelfController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\LocalizationService;

class ApiGetMyTechSupportsController extends AbstractApiGetSelfController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
        private readonly TechSupportRepository $techSupportRepository
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    protected function fetchSelf(User $user): object|array|null
    {
        $results = $this->techSupportRepository->findTechSupportsByUser($user)->getQuery()->getResult();

        if (empty($results)) {
            $results = $this->techSupportRepository->findTechSupportsByAdmin($user)->getQuery()->getResult();
        }

        return $results ?: null;
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var TechSupport $techSupport */
        foreach ($entity as $techSupport) {
            $this->localizationService->localizeEntity($techSupport->getReason(), $this->getLocale());
            if ($techSupport->getAuthor()) $this->localizationService->localizeUser($techSupport->getAuthor(), $this->getLocale());
            if ($techSupport->getAdministrant()) $this->localizationService->localizeUser($techSupport->getAdministrant(), $this->getLocale());
        }
    }
}
