<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
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

        $chatParam = $data['chat'];
        $textParam = $data['text'];
        $replyToParam = $data['replyTo'] ?? null;

        if(!$chatParam || !$textParam)
            return $this->json(['message' => "Required fields missing"], 400);

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

        /** @var ChatMessage|null $replyTo */
        $replyTo = $replyToParam
            ? $this->extractIriService->extract($replyToParam, ChatMessage::class, 'chat-messages')
            : null;

        if(!$chat) return $this->json(['message' => "Chat not found"], 404);

        if ($replyTo && $replyTo->getChat() !== $chat)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $this->accessService->check($chat->getReplyAuthor());
        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chatMessage = (new ChatMessage())
            ->setText($textParam)
            ->setChat($chat)
            ->setReplyTo($replyTo)
            ->setAuthor($bearerUser);

        $chat->addMessage($chatMessage);

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
