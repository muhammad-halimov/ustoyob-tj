<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\User;
use App\Repository\TicketRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalTicketFilterController extends AbstractController
{
    private readonly Security $security;
    private readonly TicketRepository $ticketRepository;

    public function __construct(
        Security          $security,
        TicketRepository  $ticketRepository
    )
    {
        $this->security = $security;
        $this->ticketRepository = $ticketRepository;
    }

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->security->getUser();

            $userRoles = $user?->getRoles() ?? [];
            $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

            if (!array_intersect($allowedRoles, $userRoles))
                return $this->json(['message' => 'Access denied'], 403);

            $data = $this->ticketRepository->findUserTicketsById($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['userTickets:read'],
                        'skip_null_values' => false,
                    ]
                );
        } catch (Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }
}
