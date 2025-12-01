<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Service\AccessService;
use App\Service\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatMessageRepository  $chatMessageRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = json_decode($request->getContent(), true);
        $chatParam = $data['chat'];
        $text = $data['text'];

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');
        /** @var ChatMessage $chatMessage */
        $chatMessage = $this->chatMessageRepository->find($id);

        if(!$chat)
            return $this->json(['message' => "Chat not found"], 404);

        if(!$chatMessage)
            return $this->json(['message' => "Chat message not found"], 404);

        if(!$chatParam)
            return $this->json(['message' => "Wrong chat format"], 400);

        if(!$text)
            return $this->json(['message' => "Empty message text"], 400);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $chatMessage
            ->setText($text)
            ->setChat($chat)
            ->setAuthor($bearerUser);

        $chat->addMessage($chatMessage);

        $this->entityManager->flush();

        return $this->json([
            'chat' => ['id' => $chat->getId()],
            'message' => ['id' => $chatMessage->getId()],
        ]);
    }
}
