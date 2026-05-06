<?php

namespace App\Controller\Api\CRUD\PATCH\Ticket\Ticket;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Controller\Api\CRUD\Abstract\AddressValidationTrait;
use App\Dto\Ticket\TicketPatchInput;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\ExtractIriService;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Throwable;

class ApiPatchTicketController extends AbstractApiHelperController
{
    use AddressValidationTrait;

    public function __construct(
        private readonly ExtractIriService   $extractIriService,
        private readonly TicketRepository    $ticketRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getExtractIriService(): ExtractIriService { return $this->extractIriService; }
    protected function getEntityManager(): EntityManagerInterface { return $this->entityManager; }

    protected function setSerializationGroups(): array { return G::OPS_TICKETS_FULL; }

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        try {
            $raw = $request->getContent() ?: '{}';
            $dto = $this->serializer->deserialize($raw, TicketPatchInput::class, 'json');
        } catch (Throwable) {
            return $this->errorJson(AppMessages::INVALID_JSON);
        }

        $ticket = $this->ticketRepository->find($id);

        if (!$ticket)
            return $this->errorJson(AppMessages::TICKET_NOT_FOUND);

        if ($ticket->getAuthor() !== $bearerUser && $ticket->getMaster() !== $bearerUser) {
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
        }

        /** @var Category $category */
        $category    = $dto->category    ?? $ticket->getCategory();
        $unit        = $dto->unit        ?? $ticket->getUnit();
        $subcategory = $dto->subcategory;

        if ($subcategory && !$category->getOccupations()->contains($subcategory)) {
            return $this->errorJson(AppMessages::SUBCATEGORY_NOT_IN_CATEGORY);
        }

        if (!empty($dto->address)) {
            $ticket->getAddresses()->clear();

            $normalized = $this->normalizeAddressParam($dto->address);
            if ($normalized instanceof JsonResponse) return $normalized;

            $error = $this->buildAndValidateAddresses($ticket, $normalized);
            if ($error) return $error;
        }

        if (!empty($dto->images)) {
            $this->syncImages($ticket, $dto->images, $bearerUser);
        }

        $ticket
            ->setTitle($dto->title ?? $ticket->getTitle())
            ->setDescription($dto->description ?? $ticket->getDescription())
            ->setNotice($dto->notice ?? $ticket->getNotice())
            ->setActive($dto->active ?? $ticket->getActive())
            ->setCategory($category)
            ->setSubcategory($subcategory)
            ->setUnit($unit);

        if (!empty($dto->negotiableBudget)) {
            $ticket->setNegotiableBudget($dto->negotiableBudget)->setBudget(null)->setUnit(null);
        } else {
            $ticket->setBudget($dto->budget ?? $ticket->getBudget())->setUnit($unit);
        }

        $this->flush();

        $this->afterFetch($ticket, $bearerUser);

        return $this->buildResponse($ticket);
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Ticket $entity */
        $this->localizationService->localizeTicket($entity, $this->getLocale());
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $this->getLocale());
    }

}
