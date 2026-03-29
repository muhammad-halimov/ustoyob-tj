<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\TechSupport\TechSupportMessagePostInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPostTechSupportMessageController extends AbstractApiPostController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getInputClass(): string { return TechSupportMessagePostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_MSGS; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var TechSupportMessage $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var TechSupportMessagePostInput $dto */
        if (!$dto->description) return $this->errorJson(AppMessages::EMPTY_TEXT);
        if (!$dto->techSupport) return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $techSupport = $dto->techSupport;

        if ($error = $this->checkOwnership($techSupport, $bearer)) return $error;

        $techSupportMessage = (new TechSupportMessage())
            ->setDescription($dto->description)
            ->setTechSupport($techSupport)
            ->setAuthor($bearer);

        $this->persist($techSupportMessage);

        $techSupport->addTechSupportMessage($techSupportMessage);

        $this->flush();

        return $techSupportMessage;
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var TechSupport $entity */
        if ($entity->getAdministrant() !== $bearer && $entity->getAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }
}
