<?php

namespace App\Controller\Api\Filter\Ticket\Master;

use App\Repository\TicketRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MastersTicketFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository
    ){}

    public function __invoke(): JsonResponse
    {
        $data = $this->ticketRepository->findUserTicketsByStatus(true);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['userTickets:read']]);
    }
}
