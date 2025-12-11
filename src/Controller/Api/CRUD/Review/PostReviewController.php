<?php

namespace App\Controller\Api\CRUD\Review;

use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostReviewController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $review = new Review();

        $data = json_decode($request->getContent(), true);

        $typeParam = $data['type'];
        $ratingParam = (float)$data['rating'];
        $descriptionParam = $data['description'] ?? null;
        $ticketParam = $data['ticket'] ?? null;
        $masterParam = $data['master'] ?? null;
        $clientParam = $data['client'] ?? null;

        // Проверка диапазона
        if ($ratingParam < 1 || $ratingParam > 5) return $this->json(['message' => 'Rating must be between 1 and 5'], 400);

        // Загружаем сущности только если ID переданы
        /** @var Ticket|null $ticket */
        $ticket = $ticketParam ? $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets'): null;
        /** @var User|null $client */
        $client = $clientParam ? $this->extractIriService->extract($clientParam, User::class, 'users'): null;
        /** @var User|null $master */
        $master = $masterParam ? $this->extractIriService->extract($masterParam, User::class, 'users'): null;

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
                return $this->json(['message' => 'Extra denied'], 403);

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
                return $this->json(['message' => 'Extra denied'], 403);

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
