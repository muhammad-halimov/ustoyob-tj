<?php

namespace App\Controller\Api\CRUD\GET\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetSelfController;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;

class ApiGetMyProfileController extends AbstractApiGetSelfController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function setSerializationGroups(): array { return G::OPS_USERS_ME; }

    protected function getUserGrade(): string { return 'triple'; }

    protected function isActiveAndApprovedRequired(): bool { return false; }

    protected function fetchSelf(User $user): object|array|null { return $user; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        $this->localizationService->localizeUser($user, $this->getLocale());
    }
}
