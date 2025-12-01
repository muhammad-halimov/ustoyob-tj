<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Service\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalTicketFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository,
        private readonly AccessService    $accessService,
        private readonly Security         $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Ticket[] $data */
        $data = $this->ticketRepository->findTicketsByUserRole($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['masterTickets:read', 'clientTickets:read']]);
    }
}
