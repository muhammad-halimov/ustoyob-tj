<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\TechSupport\TechSupportPostInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;

class ApiPostTechSupportController extends AbstractApiPostController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getInputClass(): string { return TechSupportPostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getReason()) $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var TechSupportPostInput $dto */
        if ($dto->reason !== null && !in_array($dto->reason->getApplicableTo(), ['support', 'overall'], true)) {
            return $this->errorJson(AppMessages::WRONG_SUPPORT_REASON);
        }

        return (new TechSupport())
            ->setTitle($dto->title)
            ->setReason($dto->reason)
            ->setStatus('new')
            ->setPriority($dto->priority)
            ->setDescription($dto->description)
            ->setAuthor($bearer);
    }
}
