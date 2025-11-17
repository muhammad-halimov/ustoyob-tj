<?php

namespace App\Controller\Api\Filter\User\Favorite;

use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\TicketRepository;
use App\Repository\User\FavoriteRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostFavoriteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FavoriteRepository     $favoriteRepository,
        private readonly TicketRepository       $ticketRepository,
        private readonly UserRepository         $userRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        $favorite = (new Favorite())->setUser($bearerUser);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if ($this->favoriteRepository->findUserFavoriteMasters($bearerUser))
            return $this->json(['message' => "This user has favorites, patch instead"], 400);

        $data = json_decode($request->getContent(), true);

        $clientsParam = $data['clients'];
        $mastersParam = $data['masters'];
        $ticketParam = $data['tickets'];

        $masters = [];
        $clients = [];
        $tickets = [];

        foreach (array_unique($mastersParam) as $master) {
            // Извлекаем ID из строки "/api/users/1" или просто "1"
            $masterId = (preg_match('#/api/users/(\d+)#', $master, $m) ? $m[1] : $master);
            $user = $this->userRepository->find($masterId);

            if (!$user || !in_array($allowedRoles[2], $user->getRoles()))
                return $this->json(['message' => "Master #$masterId not found"], 404);

            $masters[] = $user;
        }

        foreach (array_unique($clientsParam) as $client) {
            // Извлекаем ID из строки "/api/users/1" или просто "1"
            $clientId = (preg_match('#/api/users/(\d+)#', $client, $c) ? $c[1] : $client);
            $user = $this->userRepository->find($clientId);

            if (!$user || !in_array($allowedRoles[1], $user->getRoles()))
                return $this->json(['message' => "Client #$clientId not found"], 404);

            $clients[] = $user;
        }

        foreach (array_unique($ticketParam) as $ticket) {
            // Извлекаем ID из строки "/api/users/1" или просто "1"
            $ticketId = (preg_match('#/api/tickets/(\d+)#', $ticket, $t) ? $t[1] : $ticket);
            $ticketInternal = $this->ticketRepository->find($ticketId);

            if (!$ticketInternal)
                return $this->json(['message' => "Ticket #$ticketId not found"], 404);

            $tickets[] = $ticketInternal;
        }

        foreach ($masters as $master) $favorite->addMaster($master);
        foreach ($clients as $client) $favorite->addClient($client);
        foreach ($tickets as $ticket) $favorite->addTicket($ticket);

        $this->entityManager->persist($favorite);
        $this->entityManager->flush();

        return $this->json([
            'id' => $favorite->getId(),
            'user' => ['id' => $favorite->getUser()->getId()],
            'tickets' => array_map(fn($ticket) => ['id' => $ticket->getId()], $favorite->getTickets()->toArray()),
            'clients' => array_map(fn($user) => ['id' => $user->getId()], $favorite->getClients()->toArray()),
            'masters' => array_map(fn($user) => ['id' => $user->getId()], $favorite->getMasters()->toArray()),
        ]);
    }
}
