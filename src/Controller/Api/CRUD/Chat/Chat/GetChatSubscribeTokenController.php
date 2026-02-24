<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Firebase\JWT\JWT;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * GET /api/chats/{id}/subscribe
 *
 * Выдаёт фронтенду короткоживущий JWT-токен (1 час), который разрешает
 * подписаться на Mercure-топик этого конкретного чата.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ТОКЕН?
 * Топики в нашей системе помечены как private: true.
 * Это значит, что Mercure-хаб не отдаст SSE-поток всем подряд —
 * только тем, у кого есть JWT с правильным полем "mercure.subscribe".
 * Так мы гарантируем, что сообщения чата видит только его участник,
 * а не любой человек, угадавший ID чата.
 *
 * КАК ЭТО РАБОТАЕТ:
 * 1. Фронтенд вызывает этот эндпоинт со своим Bearer-токеном (JWT авторизации).
 * 2. Мы проверяем, что пользователь — участник чата.
 * 3. Возвращаем Mercure-токен + название топика.
 * 4. Фронтенд открывает EventSource с этим токеном.
 */
class GetChatSubscribeTokenController extends AbstractController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
        private readonly Security       $security,
        private readonly AccessService  $accessService,
        private readonly string         $mercureJwtSecret, // Инжектируется из services.yaml (bind $mercureJwtSecret)
    ) {}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Chat|null $chat */
        $chat = $this->chatRepository->find($id);

        if (!$chat)
            return $this->json(['message' => 'Resource not found'], 404);

        // Только участник чата может получить токен подписки
        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $topic = "chat:{$id}";

        // Создаём JWT для Mercure с ограниченным списком топиков — только этот чат
        $token = JWT::encode(
            payload: [
                'mercure' => ['subscribe' => [$topic]], // Разрешаем подписку только на один топик
                'exp'     => time() + 3600,             // Токен живёт 1 час
            ],
            key: $this->mercureJwtSecret,
            alg: 'HS256',
        );

        return $this->json([
            'token' => $token,  // Этот токен передаётся в EventSource как Authorization или query-параметр
            'topic' => $topic,  // "chat:42" — на него подписывается браузер
        ]);
    }
}
