<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Repository\Chat\ChatRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security, private readonly ChatMessageRepository $chatMessageRepository,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $data = json_decode($request->getContent(), true);
        $chatParam = $data['chat'];
        $text = $data['text'];

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        $chatId = (preg_match('#/api/chats/(\d+)#', $chatParam, $c) ? $c[1] : $chatParam);
        /** @var Chat $chat */
        $chat = $this->chatRepository->find($chatId);
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
