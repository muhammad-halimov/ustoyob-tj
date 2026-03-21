<?php

namespace App\Controller\Api\CRUD\POST\Appeal;

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
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealConntroller extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security               $security,
        private readonly ExtractIriService      $extractIriService,
        private readonly ChatRepository         $chatRepository,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User|null $bearerUser */
        $bearerUser = $this->security->getUser();

        $data = json_decode($request->getContent(), true);

        // безопасное извлечение данных
        $typeParam        = $data['type'] ?? null;
        $titleParam       = $data['title'] ?? null;
        $descriptionParam = $data['description'] ?? null;
        $reasonParam      = $data['reason'] ?? null;
        $respondentParam  = $data['respondent'] ?? null;
        $ticketParam      = $data['ticket'] ?? null;

        if (!$titleParam || !$descriptionParam || !$reasonParam || !$typeParam)
            return $this->json(['message' => 'Missing required fields'], 400);

        /** @var AppealReason $reason */
        $reason = $this->extractIriService->extract($reasonParam, AppealReason::class, 'appeal-reasons');

        if (!$reason)
            return $this->json(['message' => 'Appeal reason not found'], 404);

        /** @var User|null $respondent */
        $respondent = $respondentParam
            ? $this->extractIriService->extract($respondentParam, User::class, 'users')
            : null;

        if ($respondentParam && !$respondent)
            return $this->json(['message' => 'Respondent not found'], 404);

        if ($typeParam === 'ticket') {
            if (!$ticketParam)
                return $this->json(['message' => 'Missing ticket'], 400);

            /** @var Ticket|null $ticket */
            $ticket = $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets');

            if (!$ticket)
                return $this->json(['message' => 'Ticket not found'], 404);

            // respondent должен быть автором или мастером тикета
            if ($respondent && $ticket->getAuthor() !== $respondent && $ticket->getMaster() !== $respondent)
                return $this->json(['message' => "Respondent's ticket doesn't match"], 400);

            $appeal = (new AppealTicket())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser)
                ->setTicket($ticket);

        } elseif ($typeParam === 'chat') {
            if (!$bearerUser)
                return $this->json(['message' => 'Authentication required for chat appeals'], 401);

            if ($respondent && (
                !$this->chatRepository->findChatBetweenUsers($bearerUser, $respondent) &&
                !$this->chatRepository->findChatBetweenUsers($respondent, $bearerUser)
            ))
                return $this->json(['message' => 'No interactions between users'], 422);

            $chatParam = $data['chat'] ?? null;

            if (!$chatParam)
                return $this->json(['message' => 'Missing chat'], 400);

            /** @var Chat $chat */
            $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

            if (!$chat)
                return $this->json(['message' => 'Chat not found'], 404);

            // текущий юзер должен быть участником чата
            if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
                return $this->json(['message' => "Ownership doesn't match"], 403);

            // respondent должен быть вторым участником чата
            if ($respondent && $chat->getReplyAuthor() !== $respondent && $chat->getAuthor() !== $respondent)
                return $this->json(['message' => "Respondent's chat doesn't match"], 400);

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
                return $this->json(['message' => 'Missing review'], 400);

            /** @var Review|null $review */
            $review = $this->extractIriService->extract($reviewParam, Review::class, 'reviews');

            if (!$review)
                return $this->json(['message' => 'Review not found'], 404);

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
                return $this->json(['message' => 'Missing respondent for user appeal'], 400);

            $appeal = (new AppealUser())
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setReason($reason)
                ->setRespondent($respondent)
                ->setAuthor($bearerUser);

        } else return $this->json(['message' => "Wrong type"], 400);

        // сохраняем
        $this->entityManager->persist($appeal);
        $this->entityManager->flush();

        return $this->json($appeal, 201, context: ['groups' => [
            'appeal:read',
            'appeal:ticket:read',
            'appeal:chat:read',
            'appeal:review:read',
            'appeal:user:read',
        ]]);
    }
}

