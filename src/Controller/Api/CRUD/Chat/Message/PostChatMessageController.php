<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Service\AccessService;
use App\Service\ExtractIriService;
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
        $text = $data['text'];

        if(!$chatParam) return $this->json(['message' => "Wrong chat format"], 400);

        if(!$text) return $this->json(['message' => "Empty message text"], 400);

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

        if(!$chat) return $this->json(['message' => "Chat not found"], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $this->accessService->check($chat->getReplyAuthor());
        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chatMessage = (new ChatMessage())
            ->setText($text)
            ->setChat($chat)
            ->setAuthor($bearerUser);

        $chat->addMessage($chatMessage);

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();

        return $this->json([
            'chat' => ['id' => $chat->getId()],
            'message' => ['id' => $chatMessage->getId()],
        ]);
    }
}
