<?php

namespace App\Controller\Api\Filter\Ticket\Master;

use App\Repository\TicketRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MastersTicketCategoryFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $data = $this->ticketRepository->createQueryBuilder('t')
            ->join('t.master', 'm')
            ->where("m.roles LIKE '%ROLE_MASTER%' AND t.category = :categoryId")
            ->setParameter('categoryId', $id)
            ->getQuery()
            ->getResult();

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['clientTickets:read', 'masterTickets:read']]);
    }
}
