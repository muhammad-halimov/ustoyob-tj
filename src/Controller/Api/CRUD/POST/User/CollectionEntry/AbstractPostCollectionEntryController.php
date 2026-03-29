<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\User\CollectionEntryInput;
use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Contracts\Service\Attribute\Required;

abstract class AbstractPostCollectionEntryController extends AbstractApiPostController
{
    protected LocalizationService $localizationService;

    #[Required]
    public function setLocalizationService(LocalizationService $localizationService): void
    {
        $this->localizationService = $localizationService;
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var AbstractCollectionEntry $entity */
        if ($entity->getOwner()) $this->localizationService->localizeUser($entity->getOwner(), $this->getLocale());
        if ($entity->getUser()) $this->localizationService->localizeUser($entity->getUser(), $this->getLocale());
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    abstract protected function newEntry(): AbstractCollectionEntry;

    abstract protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): mixed;

    /** Override to add extra validation. Return error string to block, null to allow. */
    protected function validateUser(User $bearer, User $target): ?string { return null; }

    protected function validateTicket(User $bearer, Ticket $target): ?string { return null; }

    protected function getUserGrade(): string { return 'triple'; }

    protected function getInputClass(): string { return CollectionEntryInput::class; }

    final protected function handle(User $bearer, object $dto): object
    {
        /** @var CollectionEntryInput $dto */
        if ($dto->user === null && $dto->ticket === null)
            return $this->errorJson(AppMessages::PROVIDE_USER_OR_TICKET_IRI);

        if ($dto->user !== null && $dto->ticket !== null)
            return $this->errorJson(AppMessages::PROVIDE_ONLY_ONE_IRI);

        if ($dto->user !== null) {
            $user = $dto->user;

            if (!$user) return $this->errorJson(AppMessages::USER_NOT_FOUND);
            if ($bearer === $user) return $this->errorJson(AppMessages::CANNOT_ADD_YOURSELF);
            if ($this->findDuplicate($bearer, $user)) return $this->errorJson(AppMessages::ALREADY_ADDED);

            if ($error = $this->validateUser($bearer, $user))
                return $this->json(['message' => $error], 422);

            return $this->newEntry()->setOwner($bearer)->setUser($user)->setType('user');
        }

        $ticket = $dto->ticket;

        if (!$ticket) return $this->errorJson(AppMessages::TICKET_NOT_FOUND);
        if ($this->findDuplicate($bearer, null, $ticket)) return $this->errorJson(AppMessages::ALREADY_ADDED);

        if ($error = $this->validateTicket($bearer, $ticket))
            return $this->json(['message' => $error], 422);

        return $this->newEntry()->setOwner($bearer)->setTicket($ticket)->setType('ticket');
    }
}

