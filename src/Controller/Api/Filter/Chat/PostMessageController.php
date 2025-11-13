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

        /** @var User $user */
        $user = $this->security->getUser();

        $userRoles = $user?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $chatParam = $request->request->get('chat');
        if (!$chatParam) return $this->json(['message' => 'Chat parameter is required'], 400);

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        $chatId = (preg_match('#/api/chats/(\d+)#', $chatParam, $m)
            ? $m[1]
            : $chatParam);

        $text = $request->get('text');
        if (!$text) return $this->json(['message' => 'Empty message text'], 400);

        $imageFile = $request->files->get('imageFile');

        $chat = $this->chatRepository->find($chatId);

        if ($chat->getMessageAuthor() !== $user && $chat->getReplyAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $chatMessage = (new ChatMessage())
            ->setText($text)
            ->setChat($chat)
            ->setImageFile($imageFile)
            ->setAuthor($user);

        $chat->addMessage($chatMessage);

        $this->entityManager->persist($chat);
        $this->entityManager->flush();

        return new JsonResponse([
            'chatId' => $chat->getId(),
            'messageImage' => $chatMessage->getImage(),
            'message' => 'Message uploaded successfully'
        ]);
    }
}
