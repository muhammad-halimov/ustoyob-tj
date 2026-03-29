<?php

namespace App\Controller\Api\CRUD\POST\Ticket\Ticket;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Controller\Api\CRUD\Abstract\AddressValidationTrait;
use App\Dto\Ticket\TicketInput;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\ExtractIriService;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPostTicketController extends AbstractApiPostController
{
    use AddressValidationTrait;

    public function __construct(
        private readonly ExtractIriService   $extractIriService,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TICKETS_FULL; }

    protected function getExtractIriService(): ExtractIriService { return $this->extractIriService; }

    protected function getEntityManager(): EntityManagerInterface { return $this->entityManager; }

    protected function getInputClass(): string { return TicketInput::class; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Ticket $entity */
        $this->localizationService->localizeTicket($entity, $this->getLocale());
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var TicketInput $dto */
        if (!$dto->title || !$dto->description || !$dto->category)
            return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $normalized = $this->normalizeAddressParam($dto->address);

        if ($normalized instanceof JsonResponse) return $normalized;

        $subcategory = $dto->subcategory;
        $category    = $dto->category;
        $unit        = $dto->unit;

        if ($subcategory && $subcategory !== $category->getOccupation())
            return $this->errorJson(AppMessages::SUBCATEGORY_NOT_IN_CATEGORY);

        $ticket = new Ticket();

        $error = $this->buildAndValidateAddresses($ticket, $normalized);

        if ($error) return $error;

        $ticket
            ->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setNotice($dto->notice)
            ->setActive($dto->active ?? true)
            ->setCategory($category)
            ->setSubcategory($subcategory)
            ->setUnit($unit);

        if (!empty($dto->negotiableBudget)) {
            $ticket->setNegotiableBudget($dto->negotiableBudget)->setBudget(null)->setUnit(null);
        } else {
            $ticket->setBudget($dto->budget)->setUnit($unit);
        }

        if (in_array('ROLE_CLIENT', $bearer->getRoles())) {
            $ticket->setAuthor($bearer)->setMaster(null)->setService(false);
        } elseif (in_array('ROLE_MASTER', $bearer->getRoles())) {
            $ticket->setMaster($bearer)->setAuthor(null)->setService(true);
        } else {
            return $this->errorJson(AppMessages::ACCESS_DENIED);
        }

        return $ticket;
    }
}
