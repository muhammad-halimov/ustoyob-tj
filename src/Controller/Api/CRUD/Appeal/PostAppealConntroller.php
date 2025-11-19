<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
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
        private readonly UserRepository         $userRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!array_intersect($allowedRoles, $bearerUser->getRoles())) {
            return $this->json(['message' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data)
            return $this->json(['message' => 'Invalid JSON'], 400);

        // безопасное извлечение данных
        $typeParam        = $data['type'];
        $titleParam       = $data['title'] ?? null;
        $descriptionParam = $data['description'] ?? null;

        if (!$typeParam || !$titleParam || !$descriptionParam)
            return $this->json(['message' => 'Missing required fields'], 400);

        $appeal = new Appeal();

        $message = [
            'type' => $typeParam,
            'title' => $titleParam,
            'description' => $descriptionParam,
        ];

        // ---------------------------------------------------------------------
        //  COMPLAINT
        // ---------------------------------------------------------------------
        if ($typeParam === 'complaint') {

            $complaintReasonParam = $data['complaintReason'] ?? null;
            $ticketAppealParam    = (bool)($data['ticketAppeal'] ?? false);

            if (!$complaintReasonParam)
                return $this->json(['message' => 'Missing complaintReason'], 400);

            if (!in_array($complaintReasonParam, array_values(Appeal::COMPLAINTS)))
                return $this->json(['message' => 'Wrong complaint reason'], 400);

            // respondent
            $respondentParam = $data['respondent'] ?? null;
            if (!$respondentParam)
                return $this->json(['message' => 'Missing respondent'], 400);

            $respondentId = preg_match('#/api/users/(\d+)#', $respondentParam, $r) ? $r[1] : $respondentParam;

            /** @var User $respondent */
            $respondent = $this->userRepository->find($respondentId);

            if (!$respondent)
                return $this->json(['message' => 'User not found'], 404);

            // базовые поля жалобы
            $appeal
                ->setType($typeParam)
                ->setTitle($titleParam)
                ->setDescription($descriptionParam)
                ->setComplaintReason($complaintReasonParam)
                ->setAuthor($bearerUser)
                ->setRespondent($respondent);

            $message += [
                'complaintReason' => $complaintReasonParam,
                'author'     => "/api/users/{$bearerUser->getId()}",
                'respondent' => "/api/users/{$respondent->getId()}",
            ];

            // -----------------------------------------------------------------
            //  IF ticketAppeal = true
            // -----------------------------------------------------------------
            if ($ticketAppealParam) {

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
                    ->setTicket($ticket)
                    ->setTicketAppeal(true);

                $message += [
                    'ticket'       => "/api/tickets/{$ticket->getId()}",
                    'ticketAppeal' => true,
                ];
            }
        }

        // ---------------------------------------------------------------------
        //  SUPPORT
        // ---------------------------------------------------------------------
        elseif ($typeParam === 'support') {

            $supportReasonParam = $data['supportReason'] ?? null;
            $priorityParam      = $data['priority'] ?? null;

            if (!$supportReasonParam)
                return $this->json(['message' => 'Missing supportReason'], 400);

            if (!in_array($supportReasonParam, array_values(Appeal::SUPPORT)))
                return $this->json(['message' => 'Wrong support reason'], 400);

            $appeal
                ->setType($typeParam)
                ->setTitle($titleParam)
                ->setStatus("new")
                ->setPriority($priorityParam)
                ->setDescription($descriptionParam)
                ->setSupportReason($supportReasonParam)
                ->setAuthor($bearerUser);
        }

        else {
            return $this->json(['message' => "Wrong appeal type. Formats support / complaint"], 400);
        }

        // save
        $this->entityManager->persist($appeal);
        $this->entityManager->flush();

        return $this->json(['id' => $appeal->getId()] + $message, 201);
    }
}
