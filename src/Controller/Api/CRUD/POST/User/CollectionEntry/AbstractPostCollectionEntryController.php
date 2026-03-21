<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

abstract class AbstractPostCollectionEntryController extends AbstractController
{
    public function __construct(
        protected readonly EntityManagerInterface $entityManager,
        protected readonly ExtractIriService      $extractIriService,
        protected readonly AccessService          $accessService,
        protected readonly Security               $security,
    ) {}

    abstract protected function newEntry(): AbstractCollectionEntry;

    abstract protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): mixed;

    abstract protected function getSerializationGroup(): string;

    /** Override to add extra validation. Return error string to block, null to allow. */
    protected function validateUser(User $bearer, User $target): ?string  { return null; }
    protected function validateTicket(User $bearer, Ticket $target): ?string { return null; }

    final public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearer */
        $bearer = $this->security->getUser();
        $this->accessService->check($bearer);

        $data      = json_decode($request->getContent(), true) ?? [];
        $userIri   = $data['user']   ?? null;
        $ticketIri = $data['ticket'] ?? null;

        if ($userIri === null && $ticketIri === null) {
            return $this->json(['message' => 'Provide either "user" or "ticket" IRI'], 400);
        }

        if ($userIri !== null && $ticketIri !== null) {
            return $this->json(['message' => 'Provide only one of "user" or "ticket", not both'], 400);
        }

        if ($userIri !== null) {
            /** @var User|null $user */
            $user = $this->extractIriService->extract($userIri, User::class, 'users');

            if (!$user) {
                return $this->json(['message' => "User $userIri not found"], 404);
            }

            if ($bearer === $user) {
                return $this->json(['message' => 'Cannot add yourself'], 422);
            }

            if ($this->findDuplicate($bearer, $user)) {
                return $this->json(['message' => 'Already added'], 409);
            }

            if ($error = $this->validateUser($bearer, $user)) {
                return $this->json(['message' => $error], 422);
            }

            $entry = $this->newEntry()->setOwner($bearer)->setUser($user)->setType('user');
        } else {
            /** @var Ticket|null $ticket */
            $ticket = $this->extractIriService->extract($ticketIri, Ticket::class, 'tickets');

            if (!$ticket) {
                return $this->json(['message' => "Ticket $ticketIri not found"], 404);
            }

            if ($this->findDuplicate($bearer, null, $ticket)) {
                return $this->json(['message' => 'Already added'], 409);
            }

            if ($error = $this->validateTicket($bearer, $ticket)) {
                return $this->json(['message' => $error], 422);
            }

            $entry = $this->newEntry()->setOwner($bearer)->setTicket($ticket)->setType('ticket');
        }

        $this->entityManager->persist($entry);
        $this->entityManager->flush();

        return $this->json($entry, 201, context: ['groups' => [$this->getSerializationGroup()], 'skip_null_values' => true]);
    }
}

