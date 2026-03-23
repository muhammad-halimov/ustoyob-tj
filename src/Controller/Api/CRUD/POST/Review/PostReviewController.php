<?php

namespace App\Controller\Api\CRUD\POST\Review;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Repository\Review\ReviewRepository;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostReviewController extends AbstractApiController
{
    public function __construct(
        private readonly ExtractIriService      $extractIriService,
        private readonly ChatRepository         $chatRepository,
        private readonly ReviewRepository       $reviewRepository,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        $typeParam        = $data['type'];
        $ratingParam      = (float)$data['rating'];
        $descriptionParam = $data['description'] ?? null;
        $ticketParam      = $data['ticket'] ?? null;
        $masterParam      = $data['master'] ?? null;
        $clientParam      = $data['client'] ?? null;

        // Тикет обязателен — один отзыв привязан к конкретному тикету
        if (!$ticketParam)
            return $this->errorJson(AppError::MISSING_TICKET);

        // Проверка диапазона
        if ($ratingParam < 1 || $ratingParam > 5) return $this->errorJson(AppError::INVALID_RATING);

        // Загружаем сущности только если ID переданы
        /** @var Ticket|null $ticket */
        $ticket = $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets');
        /** @var User|null $client */
        $client = $clientParam ? $this->extractIriService->extract($clientParam, User::class, 'users') : null;
        /** @var User|null $master */
        $master = $masterParam ? $this->extractIriService->extract($masterParam, User::class, 'users') : null;

        if (!$ticket)
            return $this->errorJson(AppError::TICKET_NOT_FOUND);

        if (
            !$this->chatRepository->findChatBetweenUsers($bearerUser, $master) &&
            !$this->chatRepository->findChatBetweenUsers($bearerUser, $client)
        )
            return $this->errorJson(AppError::NO_INTERACTIONS);

        // Один пользователь — один отзыв на тикет (по типу: мастер оставляет клиенту, клиент — мастеру)
        if ($this->reviewRepository->findExistingReviewByAuthorAndTicket($bearerUser, $ticket, $typeParam))
            return $this->errorJson(AppError::REVIEW_ALREADY_EXISTS);

        $review = new Review();

        if ($typeParam === 'client') {
            if (!$clientParam)
                return $this->errorJson(AppError::CLIENT_PARAM_REQUIRED);

            if (!$client)
                return $this->errorJson(AppError::CLIENT_NOT_FOUND);

            if (!in_array("ROLE_MASTER", $bearerUser->getRoles()))
                return $this->errorJson(AppError::REVIEW_NOT_MASTER);

            if (!in_array("ROLE_CLIENT", $client->getRoles()))
                return $this->errorJson(AppError::REVIEW_CLIENT_ROLE_MISMATCH);

            if ($ticket->getService() && $ticket->getAuthor() !== $client)
                return $this->errorJson(AppError::REVIEW_CLIENT_TICKET_MISMATCH);

            $review->setTicket($ticket);

            $review
                ->setMaster($bearerUser)
                ->setClient($client);
        }
        elseif ($typeParam === 'master') {
            if (!$masterParam)
                return $this->errorJson(AppError::MASTER_PARAM_REQUIRED);

            if (!$master)
                return $this->errorJson(AppError::MASTER_NOT_FOUND);

            if (!in_array("ROLE_CLIENT", $bearerUser->getRoles()))
                return $this->errorJson(AppError::REVIEW_NOT_CLIENT);

            if (!in_array("ROLE_MASTER", $master->getRoles()))
                return $this->errorJson(AppError::REVIEW_MASTER_ROLE_MISMATCH);

            if (!$ticket->getService() && $ticket->getMaster() !== $master)
                return $this->errorJson(AppError::REVIEW_MASTER_SERVICE_MISMATCH);

            $review->setTicket($ticket);

            $review
                ->setClient($bearerUser)
                ->setMaster($master);
        }
        else return $this->errorJson(AppError::WRONG_REVIEW_TYPE);

        $review
            ->setDescription($descriptionParam)
            ->setRating($ratingParam)
            ->setType($typeParam);

        $this->persist($review);

        return $this->json($review, context: ['groups' => ['reviews:read', 'reviewsClient:read'], 'skip_null_values' => false]);
    }
}
