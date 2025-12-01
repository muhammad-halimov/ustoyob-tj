<?php

namespace App\Controller\Api\CRUD\User\Favorite;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use App\Service\AccessService;
use App\Service\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchFavoriteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FavoriteRepository     $favoriteRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Favorite $favorite */
        $favorite = $this->favoriteRepository->find($id);

        if (!$favorite)
            return $this->json(['message' => "Resource not found"], 404);

        if (!$this->favoriteRepository->findUserFavoriteMasters($bearerUser))
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $data = json_decode($request->getContent(), true);

        $clientsParam = $data['clients'] ?? null;
        $mastersParam = $data['masters'] ?? null;
        $ticketsParam = $data['tickets'] ?? null;

        // Проверка, что хотя бы одно поле передано (используем is_null для корректной работы с пустыми массивами)
        if (is_null($clientsParam) && is_null($mastersParam) && is_null($ticketsParam))
            return $this->json(['message' => 'At least one field (clients, masters, or tickets) must be provided'], 400);

        $masters = [];
        $clients = [];
        $tickets = [];

        // Обработка мастеров (если переданы)
        if (!is_null($mastersParam)) {
            foreach (array_unique($mastersParam) as $master) {
                /** @var User $user */
                $user = $this->extractIriService->extract($master, User::class, 'users');

                if (!$user || !in_array('ROLE_MASTER', $user->getRoles()))
                    return $this->json(['message' => "Master #$master not found"], 404);

                $masters[] = $user;
            }
        }

        // Обработка клиентов (если переданы)
        if (!is_null($clientsParam)) {
            foreach (array_unique($clientsParam) as $client) {
                /** @var User $user */
                $user = $this->extractIriService->extract($client, User::class, 'users');

                if (!$user || !in_array('ROLE_CLIENT', $user->getRoles()))
                    return $this->json(['message' => "Client #$client not found"], 404);

                $clients[] = $user;
            }
        }

        // Обработка тикетов (если переданы)
        if (!is_null($ticketsParam)) {
            foreach (array_unique($ticketsParam) as $ticket) {
                /** @var Ticket $ticketInternal */
                $ticketInternal = $this->extractIriService->extract($ticket, Ticket::class, 'tickets');

                if (!$ticketInternal)
                    return $this->json(['message' => "Ticket #$ticket not found"], 404);

                $tickets[] = $ticketInternal;
            }
        }

        // Очищаем только те коллекции, которые были переданы в запросе
        if (!is_null($mastersParam)) {
            $favorite->getMasters()->clear();
            foreach ($masters as $master) $favorite->addMaster($master);
        }

        if (!is_null($clientsParam)) {
            $favorite->getClients()->clear();
            foreach ($clients as $client) $favorite->addClient($client);
        }

        if (!is_null($ticketsParam)) {
            $favorite->getTickets()->clear();
            foreach ($tickets as $ticket) $favorite->addTicket($ticket);
        }

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
