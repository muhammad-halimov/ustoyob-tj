<?php

namespace App\Controller\Api\CRUD\GET\Ticket\Ticket;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Ticket\Ticket;
use App\Repository\Ticket\TicketRepository;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * GET /api/tickets/{id}/subscribe
 *
 * Аналог ApiGetChatSubscribeTokenController/ApiGetTechSupportSubscribeTokenController
 * (см. Chat/TechSupport) — выдаёт короткоживущий Mercure JWT на топик
 * "ticket:{id}". Фронтенд открывает соединение на карточке ЕЩЁ не
 * одобренного тикета и слушает событие "approved" — см.
 * TicketApprovalMercureListener, который публикует его в момент, когда
 * админ подтверждает объявление/услугу (Ticket::approved false → true).
 *
 * Доступ — только автор/мастер тикета (владелец карточки), тот же критерий
 * владения, что и в ApiPatchTicketController.
 */
class ApiGetTicketSubscribeTokenController extends AbstractApiHelperController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository,
        private readonly string           $mercureJwtSecret, // bind из services.yaml, общий с чатом/техподдержкой
    ) {}

    public function __invoke(string $id): JsonResponse
    {
        $bearer = $this->checkedUser();

        /** @var Ticket|null $ticket */
        $ticket = $this->ticketRepository->find($id);

        if (!$ticket)
            return $this->errorJson(AppMessages::TICKET_NOT_FOUND);

        if ($ticket->getAuthor() !== $bearer && $ticket->getMaster() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $topic = "ticket:{$id}";

        $token = JWT::encode(
            payload: [
                'mercure' => ['subscribe' => [$topic]],
                'exp'     => time() + 3600,
            ],
            key: $this->mercureJwtSecret,
            alg: 'HS256',
        );

        return $this->json([
            'token' => $token,
            'topic' => $topic,
        ]);
    }
}
