<?php

namespace App\Controller\Api\Filter\Ticket\Client;

use App\Repository\TicketRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ClientsTicketCategoryFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $data = $this->ticketRepository->createQueryBuilder('t')
            ->join('t.author', 'a')
            ->where("a.roles LIKE '%ROLE_CLIENT%' AND t.category = :categoryId")
            ->setParameter('categoryId', $id)
            ->getQuery()
            ->getResult();

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['clientTickets:read', 'masterTickets:read']]);
    }
}
