<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();

        $data = json_decode($request->getContent(), true);
        $text = $data['text'];
        $chatParam = $data['chat'];

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        $chatId = (preg_match('#/api/chats/(\d+)#', $chatParam, $c) ? $c[1] : $chatParam);
        $chat = $this->chatRepository->find($chatId);

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if(!$text || !$chatParam || !$chat)
            return $this->json(['message' => "Empty message text/chat OR Chat doesn't exist"], 400);

        if ($chat->getAuthor() !== $user && $chat->getReplyAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $chatMessage = (new ChatMessage())
            ->setText($text)
            ->setChat($chat)
            ->setAuthor($user);

        $chat->addMessage($chatMessage);

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();

        return new JsonResponse([
            'chatId' => $chat->getId(),
            'chatMessageId' => $chatMessage->getId(),
            'message' => 'Message uploaded successfully'
        ]);
    }
}
