<?php

namespace App\Controller\Api\CRUD\POST\Appeal;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Appeal\AppealReason;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealReview;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Appeal\AppealTypes\AppealUser;
use App\Entity\Chat\Chat;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealConntroller extends AbstractApiController
{
    public function __construct(
        private readonly ExtractIriService      $extractIriService,
        private readonly ChatRepository         $chatRepository,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User|null $bearerUser */
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        // безопасное извлечение данных
        $typeParam        = $data['type'] ?? null;
        $titleParam       = $data['title'] ?? null;
        $descriptionParam = $data['description'] ?? null;
        $reasonParam      = $data['reason'] ?? null;
        $respondentParam  = $data['respondent'] ?? null;
        $ticketParam      = $data['ticket'] ?? null;

        if (!$titleParam || !$descriptionParam || !$reasonParam || !$typeParam)
            return $this->errorJson(AppError::MISSING_REQUIRED_FIELDS);

        /** @var AppealReason $reason */
        $reason = $this->extractIriService->extract($reasonParam, AppealReason::class, 'appeal-reasons');

        if (!$reason)
            return $this->errorJson(AppError::APPEAL_REASON_NOT_FOUND);

        /** @var User|null $respondent */
        $respondent = $respondentParam
            ? $this->extractIriService->extract($respondentParam, User::class, 'users')
            : null;

        if ($respondentParam && !$respondent)
            return $this->errorJson(AppError::RESPONDENT_NOT_FOUND);

        if ($typeParam === 'ticket') {
            if (!$ticketParam)
                return $this->errorJson(AppError::MISSING_TICKET);

            /** @var Ticket|null $ticket */
            $ticket = $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets');

            if (!$ticket)
                return $this->errorJson(AppError::TICKET_NOT_FOUND);

            // respondent должен быть автором или мастером тикета
            if ($respondent && $ticket->getAuthor() !== $respondent && $ticket->getMaster() !== $respondent)
                return $this->errorJson(AppError::APPEAL_TICKET_MISMATCH);

            $appeal = (new AppealTicket())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser)
                ->setTicket($ticket);

        } elseif ($typeParam === 'chat') {

            if ($respondent && (
                !$this->chatRepository->findChatBetweenUsers($bearerUser, $respondent) &&
                !$this->chatRepository->findChatBetweenUsers($respondent, $bearerUser)
            ))
                return $this->errorJson(AppError::NO_INTERACTIONS);

            $chatParam = $data['chat'] ?? null;

            if (!$chatParam)
                return $this->errorJson(AppError::MISSING_CHAT);

            /** @var Chat $chat */
            $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

            if (!$chat)
                return $this->errorJson(AppError::CHAT_NOT_FOUND);

            // текущий юзер должен быть участником чата
            if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
                return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

            // respondent должен быть вторым участником чата
            if ($respondent && $chat->getReplyAuthor() !== $respondent && $chat->getAuthor() !== $respondent)
                return $this->errorJson(AppError::APPEAL_CHAT_MISMATCH);

            /** @var Ticket|null $ticket */
            $ticket = $ticketParam
                ? $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets')
                : null;

            $appeal = (new AppealChat())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser)
                ->setChat($chat)
                ->setTicket($ticket);

        } elseif ($typeParam === 'review') {
            $reviewParam = $data['review'] ?? null;

            if (!$reviewParam)
                return $this->errorJson(AppError::MISSING_REVIEW);

            /** @var Review|null $review */
            $review = $this->extractIriService->extract($reviewParam, Review::class, 'reviews');

            if (!$review)
                return $this->errorJson(AppError::REVIEW_NOT_FOUND);

            /** @var Ticket|null $ticket */
            $ticket = $ticketParam
                ? $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets')
                : null;

            $appeal = (new AppealReview())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser)
                ->setReview($review)
                ->setTicket($ticket);

        } elseif ($typeParam === 'user') {
            if (!$respondentParam)
                return $this->errorJson(AppError::MISSING_RESPONDENT);

            $appeal = (new AppealUser())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser);

        } else return $this->errorJson(AppError::WRONG_APPEAL_TYPE);

        // сохраняем
        $this->persist($appeal);

        return $this->json($appeal, 201, context: ['groups' => [
            'appeal:read',
            'appeal:ticket:read',
            'appeal:chat:read',
            'appeal:review:read',
            'appeal:user:read',
        ]]);
    }
}

