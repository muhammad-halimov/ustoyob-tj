<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

abstract class AbstractPostCollectionEntryController extends AbstractApiController
{
    public function __construct(
        protected readonly ExtractIriService $extractIriService,
    ) {}

    abstract protected function newEntry(): AbstractCollectionEntry;

    abstract protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): mixed;

    abstract protected function getSerializationGroup(): string;

    /** Override to add extra validation. Return error string to block, null to allow. */
    protected function validateUser(User $bearer, User $target): ?string  { return null; }
    protected function validateTicket(User $bearer, Ticket $target): ?string { return null; }

    final public function __invoke(Request $request): JsonResponse
    {
        $bearer = $this->checkedUser();

        $data      = json_decode($request->getContent(), true) ?? [];
        $userIri   = $data['user']   ?? null;
        $ticketIri = $data['ticket'] ?? null;

        if ($userIri === null && $ticketIri === null) {
            return $this->errorJson(AppError::PROVIDE_USER_OR_TICKET_IRI);
        }

        if ($userIri !== null && $ticketIri !== null) {
            return $this->errorJson(AppError::PROVIDE_ONLY_ONE_IRI);
        }

        if ($userIri !== null) {
            /** @var User|null $user */
            $user = $this->extractIriService->extract($userIri, User::class, 'users');

            if (!$user) return $this->errorJson(AppError::USER_NOT_FOUND);
            if ($bearer === $user) return $this->errorJson(AppError::CANNOT_ADD_YOURSELF);
            if ($this->findDuplicate($bearer, $user)) return $this->errorJson(AppError::ALREADY_ADDED);

            if ($error = $this->validateUser($bearer, $user)) {
                return $this->json(['message' => $error], 422);
            }

            $entry = $this->newEntry()->setOwner($bearer)->setUser($user)->setType('user');
        } else {
            /** @var Ticket|null $ticket */
            $ticket = $this->extractIriService->extract($ticketIri, Ticket::class, 'tickets');

            if (!$ticket) return $this->errorJson(AppError::TICKET_NOT_FOUND);
            if ($this->findDuplicate($bearer, null, $ticket)) return $this->errorJson(AppError::ALREADY_ADDED);

            if ($error = $this->validateTicket($bearer, $ticket)) {
                return $this->json(['message' => $error], 422);
            }

            $entry = $this->newEntry()->setOwner($bearer)->setTicket($ticket)->setType('ticket');
        }

        $this->persist($entry);

        return $this->json($entry, 201, context: ['groups' => [$this->getSerializationGroup()], 'skip_null_values' => true]);
    }
}

