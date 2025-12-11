<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
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

        if (!$titleParam || !$descriptionParam || !$reasonParam || !$typeParam)
            return $this->json(['message' => 'Missing required fields'], 400);

        if (!in_array($reasonParam, array_values($allComplaints)))
            return $this->json(['message' => 'Wrong complaint reason'], 400);

        /** @var User $respondent */
        $respondent = $this->extractIriService->extract($respondentParam, User::class, 'users');

        if (!$respondent)
            return $this->json(['message' => 'Respondent not found'], 404);

        $message = [
            'type'        => $typeParam,
            'title'       => $titleParam,
            'description' => $descriptionParam,
            'reason'      => $reasonParam,
            'respondent'  => "/api/users/{$respondent->getId()}",
            'author'      => "/api/users/{$bearerUser->getId()}",
        ];

        $appeal = new Appeal();

        if ($typeParam === 'ticket') {
            $ticketParam = $data['ticket'] ?? null;

            if (!$ticketParam)
                return $this->json(['message' => 'Missing ticket'], 400);

            /** @var Ticket $ticket */
            $ticket = $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets');

            if (!$ticket)
                return $this->json(['message' => 'Ticket not found'], 404);

            // correct match: respondent must be either author OR master
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

            $message += [
                'ticket' => "/api/tickets/{$ticket->getId()}"
            ];
        } elseif ($typeParam === 'chat') {
            $chatParam = $data['chat'] ?? null;

            if (!$chatParam)
                return $this->json(['message' => 'Missing chat'], 400);

            /** @var Chat $chat */
            $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

            if (!$chat)
                return $this->json(['message' => 'Chat not found'], 404);

            if ($chat->getAuthor() !== $bearerUser)
                return $this->json(['message' => "Ownership doesn't match"], 400);

            if ($chat->getReplyAuthor() !== $respondent)
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
                );

            $message += [
                'chat' => "/api/chats/{$chat->getId()}"
            ];
        } else return $this->json(['message' => "Wrong type"], 400);

        // save
        $this->entityManager->persist($appeal);
        $this->entityManager->flush();

        return $this->json(['id' => $appeal->getId()] + $message, 201);
    }
}
