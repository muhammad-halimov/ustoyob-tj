<?php

namespace App\Controller\Api\CRUD\User\Favorite;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
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

        // Проверяем, что избранное принадлежит текущему пользователю
        if ($favorite->getUser()->getId() !== $bearerUser->getId())
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $data = json_decode($request->getContent(), true);

        $clientsParam = $data['clients'] ?? null;
        $mastersParam = $data['masters'] ?? null;
        $ticketsParam = $data['tickets'] ?? null;

        // Проверка, что хотя бы одно поле передано
        if (is_null($clientsParam) && is_null($mastersParam) && is_null($ticketsParam))
            return $this->json(['message' => 'At least one field (clients, masters, or tickets) must be provided'], 400);

        $masters = [];
        $clients = [];
        $tickets = [];

        $messages = [];

        // Обработка мастеров (если переданы)
        if (!is_null($mastersParam)) {
            foreach (array_unique($mastersParam) as $master) {
                /** @var User $user */
                $user = $this->extractIriService->extract($master, User::class, 'users');

                if (!$user || !in_array('ROLE_MASTER', $user->getRoles())) {
                    $messages[] = "Master #$master not found";
                    continue;
                }

                if ($bearerUser === $user) {
                    $messages[] = "Cannot add yourself to favorites";
                    continue;
                }

                // Пропускаем, если мастер уже есть в избранном
                if ($favorite->getMasters()->contains($user))
                    continue;

                // Проверяем чёрный список - если в ЧС, пропускаем без ошибки
                try {
                    $this->accessService->checkBlackList($bearerUser, $user);
                    $masters[] = $user;
                } catch (Exception $e) {
                    $messages[] = "Master #{$user->getId()} skipped: " . $e->getMessage();
                    continue;
                }
            }
        }

        // Обработка клиентов (если переданы)
        if (!is_null($clientsParam)) {
            foreach (array_unique($clientsParam) as $client) {
                /** @var User $user */
                $user = $this->extractIriService->extract($client, User::class, 'users');

                if (!$user || !in_array('ROLE_CLIENT', $user->getRoles())) {
                    $messages[] = "Client #$client not found";
                    continue;
                }

                if ($bearerUser === $user) {
                    $messages[] = "Cannot add yourself to favorites";
                    continue;
                }

                // Пропускаем, если клиент уже есть в избранном
                if ($favorite->getClients()->contains($user))
                    continue;

                // Проверяем чёрный список - если в ЧС, пропускаем без ошибки
                try {
                    $this->accessService->checkBlackList($bearerUser, $user);
                    $clients[] = $user;
                } catch (Exception $e) {
                    $messages[] = "Client #{$user->getId()} skipped: " . $e->getMessage();
                    continue;
                }
            }
        }

        // Обработка тикетов (если переданы)
        if (!is_null($ticketsParam)) {
            foreach (array_unique($ticketsParam) as $ticket) {
                /** @var Ticket $ticketInternal */
                $ticketInternal = $this->extractIriService->extract($ticket, Ticket::class, 'tickets');

                if (!$ticketInternal) {
                    $messages[] = "Ticket #$ticket not found";
                    continue;
                }

                // Пропускаем, если тикет уже есть в избранном
                if ($favorite->getTickets()->contains($ticketInternal))
                    continue;

                // Проверяем доступ к тикету
                try {
                    $this->accessService->checkBlackList($bearerUser, ticket: $ticketInternal);
                    $tickets[] = $ticketInternal;
                } catch (Exception $e) {
                    $messages[] = "Ticket #{$ticketInternal->getId()} skipped: " . $e->getMessage();
                    continue;
                }
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
            'messages' => $messages,
        ]);
    }
}
