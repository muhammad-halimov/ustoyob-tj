<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Repository\TicketRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealConntroller extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TicketRepository       $ticketRepository,
        private readonly ChatRepository         $chatRepository,
        private readonly UserRepository         $userRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $allComplaints = array_unique(
            array_merge(
                AppealChat::COMPLAINTS,
                AppealTicket::COMPLAINTS,
            )
        );

        if (!array_intersect($allowedRoles, $bearerUser->getRoles())) {
            return $this->json(['message' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data)
            return $this->json(['message' => 'Invalid JSON'], 400);

        // безопасное извлечение данных
        $typeParam            = $data['type'] ?? null;
        $titleParam           = $data['title'] ?? null;
        $descriptionParam     = $data['description'] ?? null;
        $complaintReasonParam = $data['complaintReason'] ?? null;
        $respondentParam      = $data['respondent'] ?? null;

        if (!$titleParam || !$descriptionParam || !$complaintReasonParam || !$typeParam)
            return $this->json(['message' => 'Missing required fields'], 400);

        if (!in_array($complaintReasonParam, array_values($allComplaints)))
            return $this->json(['message' => 'Wrong complaint reason'], 400);

        $respondentId = preg_match('#/api/users/(\d+)#', $respondentParam, $r) ? $r[1] : $respondentParam;
        /** @var User $respondent */
        $respondent = $this->userRepository->find($respondentId);

        if (!$respondent)
            return $this->json(['message' => 'Respondent not found'], 404);

        $message = [
            'type'            => $typeParam,
            'title'           => $titleParam,
            'description'     => $descriptionParam,
            'complaintReason' => $complaintReasonParam,
            'respondent'      => "/api/users/{$respondent->getId()}",
            'author'          => "/api/users/{$bearerUser->getId()}",
        ];

        $appeal = new Appeal();

        if ($typeParam === 'ticket') {
            $ticketParam = $data['ticket'] ?? null;

            if (!$ticketParam)
                return $this->json(['message' => 'Missing ticket'], 400);

            $ticketId = preg_match('#/api/tickets/(\d+)#', $ticketParam, $t) ? $t[1] : $ticketParam;
            /** @var Ticket $ticket */
            $ticket = $this->ticketRepository->find($ticketId);

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
                    ->setComplaintReason($complaintReasonParam)
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

            $chatId = preg_match('#/api/chats/(\d+)#', $chatParam, $c) ? $c[1] : $chatParam;

            /** @var Chat $chat */
            $chat = $this->chatRepository->find($chatId);

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
                    ->setComplaintReason($complaintReasonParam)
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
