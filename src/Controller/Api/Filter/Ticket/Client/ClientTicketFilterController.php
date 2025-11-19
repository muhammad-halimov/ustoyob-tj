<?php

namespace App\Controller\Api\Filter\Ticket\Client;

use App\Entity\User;
use App\Repository\TicketRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ClientTicketFilterController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository,
        private readonly UserRepository   $userRepository,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        $data = $this->ticketRepository->findUserTicketsByClientRole($user);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['clientTickets:read']]);
    }
}
