<?php

namespace App\Controller\Api\CRUD\GET\Ticket\Ticket;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

class ApiGetMyTicketsController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
        private readonly TicketRepository    $ticketRepository,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TICKETS_FULL; }

    protected function fetchQuery(User $user): ?QueryBuilder { return $this->ticketRepository->findTicketsByUserRole($user); }

    protected function afterFetch(array|object $entity, User $user): void
    {
        /** @var Ticket $ticket */
        foreach ($entity as $ticket) {
            $this->localizationService->localizeTicket($ticket, $this->getLocale());
            if ($ticket->getAuthor()) $this->localizationService->localizeUser($ticket->getAuthor(), $this->getLocale());
            if ($ticket->getMaster()) $this->localizationService->localizeUser($ticket->getMaster(), $this->getLocale());
        }
    }
}
