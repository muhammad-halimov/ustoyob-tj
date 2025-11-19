<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Repository\TicketRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class TicketCategoryFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $data = $this->ticketRepository->findBy(['category' => $id,]);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['clientTickets:read', 'masterTickets:read']]);
    }
}
