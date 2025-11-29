<?php

namespace App\State\Ticket;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Dto\Ticket\TicketOutput;
use App\Repository\TicketRepository;

readonly class TicketProvider implements ProviderInterface
{
    public function __construct(
        private TicketRepository $ticketRepository
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            $tickets = $this->ticketRepository->findAll();

            return array_map(
                fn($ticket) => $this->toOutput($ticket),
                $tickets
            );
        }

        // Для Get операции
        $ticket = $this->ticketRepository->find($uriVariables['id']);
        return $ticket ? $this->toOutput($ticket) : null;
    }

    private function toOutput($ticket): TicketOutput
    {
        $output = new TicketOutput();
        $output->title = $ticket->getTitle();
        $output->description = $ticket->getDescription();
        $output->notice = $ticket->getNotice();
        $output->active = $ticket->getActive();
        $output->service = $ticket->getService();
        $output->budget = $ticket->getBudget();
        $output->category = $ticket->getCategory();
        $output->unit = $ticket->getUnit();
        $output->district = $ticket->getAddress();
        $output->master = $ticket->getMaster();
        $output->author = $ticket->getAuthor();

        return $output;
    }
}
