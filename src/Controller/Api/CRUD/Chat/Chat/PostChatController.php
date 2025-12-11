<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

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

class PostChatController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
        private readonly ExtractIriService      $extractIriService,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = json_decode($request->getContent(), true);

        $replyAuthorParam = $data['replyAuthor'];
        $ticketParam = $data['ticket'] ?? null;

        /** @var User $replyAuthor */
        $replyAuthor = $this->extractIriService->extract($replyAuthorParam, User::class, 'users');

        /** @var Ticket|null $ticket */
        $ticket = $ticketParam
            ? $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets')
            : null;

        if (!$replyAuthor)
            return $this->json(['message' => 'User not found'], 404);

        if ($replyAuthor === $bearerUser)
            return $this->json(['message' => 'You cannot post a chat with yourself'], 403);

        $this->accessService->check($replyAuthor);
        $this->accessService->checkBlackList($bearerUser, $replyAuthor);

        // Проверяем существование тикета, если он передан
        if ($ticketParam && !$ticket)
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

        $chat = (new Chat())
            ->setActive(true)
            ->setAuthor($bearerUser)
            ->setReplyAuthor($replyAuthor);

        if (!$ticket &&  // Чат клиента/мастера с мастером/клиентом, без тикета
            (in_array("ROLE_CLIENT", $bearerUser->getRoles()) || in_array("ROLE_MASTER", $bearerUser->getRoles())) &&
            (in_array("ROLE_CLIENT", $replyAuthor->getRoles()) || in_array("ROLE_MASTER", $replyAuthor->getRoles()))) {

            $this->entityManager->persist($chat->setTicket(null));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RC/M - RC/M']);
        }

        if ($ticket &&  // Чат клиента с мастером, отклик на услугу мастера
            in_array("ROLE_CLIENT", $bearerUser->getRoles()) &&
            in_array("ROLE_MASTER", $replyAuthor->getRoles()) &&
            $ticket->getMaster() === $replyAuthor){

            $this->entityManager->persist($chat->setTicket($ticket));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RC -> RM/T']);
        }

        if ($ticket &&  // Чат мастера с клиентом, отклик на объявление клиента
            in_array("ROLE_MASTER", $bearerUser->getRoles()) &&
            in_array("ROLE_CLIENT", $replyAuthor->getRoles()) &&
            $ticket->getAuthor() === $replyAuthor) {

            $this->entityManager->persist($chat->setTicket($ticket));

            $this->entityManager->flush();

            return $this->json(['message' => 'Resource successfully posted. RM -> RC/T']);
        }

        return $this->json(['message' => "Probably ticket's author/master doesn't match to reply author"], 400);
    }
}
