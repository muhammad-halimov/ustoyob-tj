<?php

namespace App\Controller\Api\CRUD\POST\Chat\Chat;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\Chat\ChatPostInput;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\LocalizationService;

class ApiPostChatController extends AbstractApiPostController
{
    public function __construct(
        private readonly ChatRepository      $chatRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getInputClass(): string { return ChatPostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_CHATS; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Chat $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getReplyAuthor()) $this->localizationService->localizeUser($entity->getReplyAuthor(), $this->getLocale());
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var ChatPostInput $dto */

        if (!$dto->replyAuthor) return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $replyAuthor = $dto->replyAuthor;

        if ($replyAuthor === $bearer) return $this->errorJson(AppMessages::CHAT_WITH_SELF);

        $this->accessService->check($replyAuthor);
        $this->accessService->checkBlackList($bearer, $replyAuthor);

        $ticket = $dto->ticket;

        $criteria = ['author' => $bearer, 'replyAuthor' => $replyAuthor, 'ticket' => $ticket];
        $reverse  = ['author' => $replyAuthor, 'replyAuthor' => $bearer, 'ticket' => $ticket];

        if ($this->chatRepository->findOneBy($criteria) || $this->chatRepository->findOneBy($reverse)) {
            return $this->errorJson(AppMessages::CHAT_ALREADY_EXISTS);
        }

        if ($ticket && !$this->isTicketChatAllowed($bearer, $replyAuthor, $ticket)) {
            return $this->errorJson(AppMessages::CHAT_REPLY_AUTHOR_MISMATCH);
        }

        $allowedRoles = ['ROLE_CLIENT', 'ROLE_MASTER'];
        if (!$ticket
            && (!array_intersect($allowedRoles, $bearer->getRoles()) || !array_intersect($allowedRoles, $replyAuthor->getRoles()))) {
            return $this->errorJson(AppMessages::CHAT_REPLY_AUTHOR_MISMATCH);
        }

        return (new Chat())
            ->setActive(true)
            ->setAuthor($bearer)
            ->setReplyAuthor($replyAuthor)
            ->setTicket($ticket);
    }

    private function isTicketChatAllowed(User $bearer, User $replyAuthor, Ticket $ticket): bool
    {
        $bearerRoles = $bearer->getRoles();
        $replyRoles  = $replyAuthor->getRoles();

        if (in_array('ROLE_CLIENT', $bearerRoles, true)
            && in_array('ROLE_MASTER', $replyRoles, true)
            && $ticket->getMaster() === $replyAuthor) {
            return true;
        }

        if (in_array('ROLE_MASTER', $bearerRoles, true)
            && in_array('ROLE_CLIENT', $replyRoles, true)
            && $ticket->getAuthor() === $replyAuthor) {
            return true;
        }

        return false;
    }
}
