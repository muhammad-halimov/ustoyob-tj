<?php

namespace App\Controller\Api\CRUD\GET\Chat\Chat;

use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Chat\Chat;
use App\Repository\Chat\ChatRepository;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * GET /api/chats/inbox-token
 *
 * Выдаёт единый Mercure JWT-токен для подписки на ВСЕ чаты пользователя.
 * Фронтенд использует его для открытия одного глобального SSE-соединения,
 * которое получает события (created/updated/deleted) из всех чатов одновременно.
 * Это позволяет обновлять счётчики непрочитанных сообщений в реальном времени,
 * не заходя в каждый чат отдельно.
 */
class ApiGetInboxTokenController extends AbstractApiHelperController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
        private readonly string         $mercureJwtSecret,
    ) {}

    public function __invoke(): JsonResponse
    {
        $user = $this->checkedUser();

        /** @var Chat[] $chats */
        $chats = $this->chatRepository->findUserChats($user)->getQuery()->getResult();

        $topics = array_values(
            array_filter(
                array_map(fn(Chat $c) => $c->getId() ? "chat:{$c->getId()}" : null, $chats)
            )
        );

        if (empty($topics)) {
            return $this->json(['token' => null, 'topics' => []]);
        }

        $token = JWT::encode(
            payload: [
                'mercure' => ['subscribe' => $topics],
                'exp'     => time() + 3600,
            ],
            key: $this->mercureJwtSecret,
            alg: 'HS256',
        );

        return $this->json(['token' => $token, 'topics' => $topics]);
    }
}
