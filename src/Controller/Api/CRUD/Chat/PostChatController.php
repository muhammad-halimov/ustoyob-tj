<?php

namespace App\Controller\Api\CRUD\Chat;

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

class PostChatController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TicketRepository       $ticketRepository,
        private readonly ChatRepository         $chatRepository,
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

        $data = json_decode($request->getContent(), true);

        $replyAuthorParam = $data['replyAuthor'];
        $ticketParam = $data['ticket'] ?? null;

        $replyAuthorId = (preg_match('#/api/users/(\d+)#', $replyAuthorParam, $m) ? $m[1] : $replyAuthorParam);
        $ticketId = $ticketParam ? (preg_match('#/api/tickets/(\d+)#', $ticketParam, $t) ? $t[1] : $ticketParam) : null;

        /** @var User $replyAuthor */
        $replyAuthor = $this->userRepository->find($replyAuthorId);
        /** @var Ticket $ticket */
        $ticket = $ticketId ? $this->ticketRepository->find($ticketId) : null;

        if (!$replyAuthor)
            return $this->json(['message' => 'User not found'], 404);

        if ($replyAuthor === $bearerUser)
            return $this->json(['message' => 'You cannot post a chat with yourself'], 403);

        // Проверяем существование тикета, если он передан
        if ($ticketId && !$ticket)
            return $this->json(['message' => 'Ticket not found'], 404);

        // Проверка на дубликат чата с учетом тикета
        $existingChat = $this->chatRepository->findOneBy([
            'author' => $bearerUser,
            'replyAuthor' => $replyAuthor,
            'ticket' => $ticket // null если без тикета, конкретный тикет если с тикетом
        ]);

        // Также проверяем обратное направление (replyAuthor -> author)
        if (!$existingChat)
            $existingChat = $this->chatRepository->findOneBy([
                'author' => $replyAuthor,
                'replyAuthor' => $bearerUser,
                'ticket' => $ticket
            ]);

        if ($existingChat)
            return $this->json(['message' => 'Chat already exists'], 409);

        if (!$ticket &&  // Чат клиента/мастера с мастером/клиентом, без тикета
            (in_array("ROLE_CLIENT", $bearerUser->getRoles()) || in_array("ROLE_MASTER", $bearerUser->getRoles())) &&
            (in_array("ROLE_CLIENT", $replyAuthor->getRoles()) || in_array("ROLE_MASTER", $replyAuthor->getRoles()))) {

            $this->entityManager->persist((new Chat())
                ->setTicket(null)
                ->setAuthor($bearerUser)
                ->setReplyAuthor($replyAuthor));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RC/M - RC/M']);
        }

        if ($ticket &&  // Чат клиента с мастером, отклик на услугу мастера
            in_array("ROLE_CLIENT", $bearerUser->getRoles()) &&
            in_array("ROLE_MASTER", $replyAuthor->getRoles()) &&
            $ticket->getMaster() === $replyAuthor){

            $this->entityManager
                ->persist((new Chat())
                    ->setTicket($ticket)
                    ->setAuthor($bearerUser)
                    ->setReplyAuthor($replyAuthor));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RC -> RM/T']);
        }

        if ($ticket &&  // Чат мастера с клиентом, отклик на объявление клиента
            in_array("ROLE_MASTER", $bearerUser->getRoles()) &&
            in_array("ROLE_CLIENT", $replyAuthor->getRoles()) &&
            $ticket->getAuthor() === $replyAuthor) {

            $this->entityManager
                ->persist((new Chat())
                    ->setTicket($ticket)
                    ->setAuthor($bearerUser)
                    ->setReplyAuthor($replyAuthor));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RM -> RC/T']);
        }

        return $this->json(['message' => "Probably ticket's author/master doesn't match to reply author"], 400);
    }
}
