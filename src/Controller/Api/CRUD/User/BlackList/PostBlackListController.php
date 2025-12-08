<?php

namespace App\Controller\Api\CRUD\User\BlackList;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\BlackList;
use App\Repository\User\BlackListRepository;
use App\Service\AccessService;
use App\Service\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostBlackListController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly BlackListRepository    $blackListRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        // Проверяем, есть ли уже чёрный список у пользователя
        $existingBlackLists = $this->blackListRepository->findBlackLists($bearerUser);

        if (!empty($existingBlackLists))
            return $this->json(['message' => "This user has blacklist, patch instead"], 400);

        $blackList = (new BlackList())->setAuthor($bearerUser);

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
                    $messages[] = "Cannot add yourself to blacklist";
                    continue;
                }

                $masters[] = $user;
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
                    $messages[] = "Cannot add yourself to blacklist";
                    continue;
                }

                $clients[] = $user;
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

                $tickets[] = $ticketInternal;
            }
        }

        // Добавляем только те сущности, которые прошли проверку
        foreach ($masters as $master) $blackList->addMaster($master);
        foreach ($clients as $client) $blackList->addClient($client);
        foreach ($tickets as $ticket) $blackList->addTicket($ticket);

        $this->entityManager->persist($blackList);
        $this->entityManager->flush();

        return $this->json([
            'id' => $blackList->getId(),
            'author' => ['id' => $blackList->getAuthor()->getId()],
            'tickets' => array_map(fn($ticket) => ['id' => $ticket->getId()], $blackList->getTickets()->toArray()),
            'clients' => array_map(fn($user) => ['id' => $user->getId()], $blackList->getClients()->toArray()),
            'masters' => array_map(fn($user) => ['id' => $user->getId()], $blackList->getMasters()->toArray()),
            'messages' => $messages,
        ]);
    }
}
