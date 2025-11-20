<?php

namespace App\Controller\Api\CRUD\Review;

use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostReviewController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
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

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $review = new Review();

        $data = json_decode($request->getContent(), true);

        $typeParam = $data['type'];
        $ratingParam = (float)$data['rating'];
        $descriptionParam = $data['description'] ?? null;
        $ticketParam = $data['ticket'] ?? null;
        $masterParam = $data['master'] ?? null;
        $clientParam = $data['client'] ?? null;

        // Проверка диапазона (например, от 1 до 5)
        if ($ratingParam < 1 || $ratingParam > 5) return $this->json(['message' => 'Rating must be between 1 and 5'], 400);

        // Извлекаем ID только если параметры переданы
        $ticketId = $ticketParam ? (preg_match('#/api/tickets/(\d+)#', $ticketParam, $t) ? $t[1] : $ticketParam) : null;
        $masterId = $masterParam ? (preg_match('#/api/users/(\d+)#', $masterParam, $m) ? $m[1] : $masterParam) : null;
        $clientId = $clientParam ? (preg_match('#/api/users/(\d+)#', $clientParam, $c) ? $c[1] : $clientParam) : null;

        // Загружаем сущности только если ID переданы
        /** @var Ticket|null $ticket */
        $ticket = $ticketId ? $this->ticketRepository->find($ticketId) : null;
        /** @var User|null $client */
        $client = $clientId ? $this->userRepository->find($clientId) : null;
        /** @var User|null $master */
        $master = $masterId ? $this->userRepository->find($masterId) : null;

        $message = [
            'type' => $typeParam,
            'rating' => $ratingParam,
            'description' => $descriptionParam,
        ];

        if ($typeParam === 'client') {
            if (!$clientParam)
                return $this->json(['message' => 'Client parameter is required'], 400);

            if (!$client)
                return $this->json(['message' => 'Client not found'], 404);

            if (!in_array("ROLE_MASTER", $bearerUser->getRoles()))
                return $this->json(['message' => 'Access denied'], 403);

            if (!in_array("ROLE_CLIENT", $client->getRoles()))
                return $this->json(['message' => "Client's role doesn't match"], 403);

            if ($ticket) {
                if ($ticket->getService() && $ticket->getAuthor() !== $client)
                    return $this->json(['message' => "Client's ticket doesn't match"], 404);

                $review->setServices($ticket);

                $message += [
                    'ticket' => "/api/tickets/{$ticket->getId()}",
                ];
            }

            $review
                ->setMaster($bearerUser)
                ->setClient($client);

            $message += [
                'master' => "/api/users/{$bearerUser->getId()}",
                'client' => "/api/users/{$client->getId()}",
            ];
        }
        elseif ($typeParam === 'master') {
            if (!$masterParam)
                return $this->json(['message' => 'Master parameter is required'], 400);

            if (!$master)
                return $this->json(['message' => 'Master not found'], 404);

            if (!in_array("ROLE_CLIENT", $bearerUser->getRoles()))
                return $this->json(['message' => 'Access denied'], 403);

            if (!in_array("ROLE_MASTER", $master->getRoles()))
                return $this->json(['message' => "Master's role doesn't match"], 403);

            if ($ticket) {
                if (!$ticket->getService() && $ticket->getMaster() !== $master)
                    return $this->json(['message' => "Master's service doesn't match"], 404);

                $review->setServices($ticket);

                $message += [
                    'ticket' => "/api/tickets/{$ticket->getId()}",
                ];
            }

            $review
                ->setClient($bearerUser)
                ->setMaster($master);

            $message += [
                'master' => "/api/users/{$master->getId()}",
                'client' => "/api/users/{$bearerUser->getId()}",
            ];
        }
        else return $this->json(['message' => 'Wrong review type'], 400);

        $review
            ->setDescription($descriptionParam)
            ->setRating($ratingParam)
            ->setType($typeParam);

        $this->entityManager->persist($review);
        $this->entityManager->flush();

        return $this->json((['id' => $review->getId()] + $message), 201);
    }
}
