<?php

namespace App\Controller\Api\CRUD\POST\Chat\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatMessageController extends AbstractApiController
{
    public function __construct(
        private readonly ExtractIriService      $extractIriService,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        $chatParam = $data['chat'] ?? null;
        $textParam = $data['description'] ?? '';
        $replyToParam = $data['replyTo'] ?? null;

        if (!$chatParam || !array_key_exists('description', $data))
            return $this->errorJson(AppError::MISSING_REQUIRED_FIELDS);

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

        /** @var ChatMessage|null $replyTo */
        $replyTo = $replyToParam
            ? $this->extractIriService->extract($replyToParam, ChatMessage::class, 'chat-messages')
            : null;

        if(!$chat) return $this->errorJson(AppError::CHAT_NOT_FOUND);

        if ($replyTo && $replyTo->getChat() !== $chat)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        $this->accessService->check($chat->getReplyAuthor());
        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chatMessage = (new ChatMessage())
            ->setDescription($textParam)
            ->setChat($chat)
            ->setReplyTo($replyTo)
            ->setAuthor($bearerUser);

        $chat->addMessage($chatMessage);

        $this->persist($chatMessage);

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
