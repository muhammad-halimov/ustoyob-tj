<?php

namespace App\Controller\Api\Filter\Appeal\Compliant;

use App\Entity\Appeal\Appeal;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Repository\User\AppealRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class TicketComplaintFilterController extends AbstractController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly TicketRepository $ticketRepository,
        private readonly Security         $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();
        /** @var Ticket $ticket */
        $ticket = $this->ticketRepository->find($id);

        if (!$ticket)
            return $this->json(['message' => 'Ticket not found'], 404);

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        /** @var Appeal $appeals */
        $appeals = $this->appealRepository->findTicketComplaintsById(true, $ticket, 'complaint');

        return empty($appeals)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($appeals, context: ['groups' => ['appealsTicket:read']]);
    }
}
