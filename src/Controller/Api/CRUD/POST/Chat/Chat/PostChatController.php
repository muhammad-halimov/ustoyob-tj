<?php

namespace App\Controller\Api\CRUD\POST\Chat\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatController extends AbstractApiController
{
    public function __construct(
        private readonly ChatRepository    $chatRepository,
        private readonly ExtractIriService $extractIriService,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        $replyAuthorParam = $data['replyAuthor'] ?? null;
        $ticketParam = $data['ticket'] ?? null;

        if (!$replyAuthorParam) return $this->errorJson(AppError::MISSING_REQUIRED_FIELDS);

        /** @var User|null $replyAuthor */
        $replyAuthor = $this->extractIriService->extract($replyAuthorParam, User::class, 'users');

        if (!$replyAuthor) return $this->errorJson(AppError::USER_NOT_FOUND);

        if ($replyAuthor === $bearerUser) return $this->errorJson(AppError::CHAT_WITH_SELF);

        $this->accessService->check($replyAuthor);
        $this->accessService->checkBlackList($bearerUser, $replyAuthor);

        /** @var Ticket|null $ticket */
        $ticket = $ticketParam
            ? $this->extractIriService->extract($ticketParam, Ticket::class, 'tickets')
            : null;

        if ($ticketParam && !$ticket) return $this->errorJson(AppError::TICKET_NOT_FOUND);

        // Проверка дубликата в обоих направлениях
        $criteria = ['author' => $bearerUser, 'replyAuthor' => $replyAuthor, 'ticket' => $ticket];
        $reverse  = ['author' => $replyAuthor, 'replyAuthor' => $bearerUser, 'ticket' => $ticket];

        if ($this->chatRepository->findOneBy($criteria) || $this->chatRepository->findOneBy($reverse)) {
            return $this->errorJson(AppError::CHAT_ALREADY_EXISTS);
        }

        // Валидация: с тикетом — автор тикета должен быть одним из участников
        if ($ticket && !$this->isTicketChatAllowed($bearerUser, $replyAuthor, $ticket)) {
            return $this->errorJson(AppError::CHAT_REPLY_AUTHOR_MISMATCH);
        }

        // Без тикета — оба должны быть CLIENT или MASTER
        $allowedRoles = ['ROLE_CLIENT', 'ROLE_MASTER'];
        if (!$ticket
            && (!array_intersect($allowedRoles, $bearerUser->getRoles()) || !array_intersect($allowedRoles, $replyAuthor->getRoles()))) {
            return $this->errorJson(AppError::CHAT_REPLY_AUTHOR_MISMATCH);
        }

        $chat = (new Chat())
            ->setActive(true)
            ->setAuthor($bearerUser)
            ->setReplyAuthor($replyAuthor)
            ->setTicket($ticket);

        $this->persist($chat);

        return $this->json($chat, 201, context: ['groups' => ['chats:read']]);
    }

    /**
     * Тикетный чат: клиент→мастер (откликается на услугу) или мастер→клиент (откликается на объявление).
     */
    private function isTicketChatAllowed(User $bearer, User $replyAuthor, Ticket $ticket): bool
    {
        $bearerRoles = $bearer->getRoles();
        $replyRoles  = $replyAuthor->getRoles();

        // Клиент → мастер: тикет принадлежит мастеру
        if (in_array('ROLE_CLIENT', $bearerRoles, true)
            && in_array('ROLE_MASTER', $replyRoles, true)
            && $ticket->getMaster() === $replyAuthor) {
            return true;
        }

        // Мастер → клиент: тикет принадлежит клиенту
        if (in_array('ROLE_MASTER', $bearerRoles, true)
            && in_array('ROLE_CLIENT', $replyRoles, true)
            && $ticket->getAuthor() === $replyAuthor) {
            return true;
        }

        return false;
    }
}
