<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
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
        private readonly AccessService          $accessService,
        private readonly ExtractIriService      $extractIriService,
        private readonly ChatRepository         $chatRepository,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $allComplaints = array_unique(array_merge(AppealChat::COMPLAINTS, AppealTicket::COMPLAINTS));

        $data = json_decode($request->getContent(), true);

        // безопасное извлечение данных
        $typeParam        = $data['type'] ?? null;
        $titleParam       = $data['title'] ?? null;
        $descriptionParam = $data['description'] ?? null;
        $reasonParam      = $data['reason'] ?? null;
        $respondentParam  = $data['respondent'] ?? null;
        $ticketParam      = $data['ticket'] ?? null;

        if (!$titleParam || !$descriptionParam || !$reasonParam || !$typeParam || !$ticketParam)
            return $this->json(['message' => 'Missing required fields'], 400);

        if (!in_array($reasonParam, array_values($allComplaints)))
            return $this->json(['message' => 'Wrong complaint reason'], 400);

        /** @var User $respondent */
        $respondent = $this->extractIriService->extract($respondentParam, User::class, 'users');

        /** @var Ticket $ticket */
        $ticket = $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets');

        if (!$respondent)
            return $this->json(['message' => 'Respondent not found'], 404);

        if (!$ticket)
            return $this->json(['message' => 'Ticket not found'], 404);

        if (
            !$this->chatRepository->findChatBetweenUsers($bearerUser, $respondent) &&
            !$this->chatRepository->findChatBetweenUsers($respondent, $bearerUser)
        )
            return $this->json(['message' => 'No interactions between users'], 422);

        $appeal = new Appeal();

        if ($typeParam === 'ticket') {
            // respondent должен быть автором или мастером тикета
            if ($ticket->getAuthor() !== $respondent && $ticket->getMaster() !== $respondent)
                return $this->json(['message' => "Respondent's ticket doesn't match"], 400);

            $appeal
                ->setType($typeParam)
                ->addAppealTicket((new AppealTicket())
                    ->setTitle($titleParam)
                    ->setDescription($descriptionParam)
                    ->setReason($reasonParam)
                    ->setRespondent($respondent)
                    ->setAuthor($bearerUser)
                    ->setTicket($ticket)
                );
        } elseif ($typeParam === 'chat') {
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
            if ($chat->getReplyAuthor() !== $respondent && $chat->getAuthor() !== $respondent)
                return $this->json(['message' => "Respondent's chat doesn't match"], 400);

            $appeal
                ->setType($typeParam)
                ->addAppealChat((new AppealChat())
                    ->setTitle($titleParam)
                    ->setDescription($descriptionParam)
                    ->setReason($reasonParam)
                    ->setRespondent($respondent)
                    ->setAuthor($bearerUser)
                    ->setChat($chat)
                    ->setTicket($ticket)
                );
        } else return $this->json(['message' => "Wrong type"], 400);

        // сохраняем
        $this->entityManager->persist($appeal);
        $this->entityManager->flush();

        return $this->json($appeal, 201, context: ['groups' => [
            'appeal:read',
            'appeal:ticket:read',
            'appeal:chat:read'
        ]]);
    }
}
