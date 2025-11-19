<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class ChatFilterController extends AbstractController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
        private readonly Security       $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();
        /** @var Chat $chat */
        $chat = $this->chatRepository->find($id);

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$chat)
            return $this->json(['message' => 'Chat not found'], 404);

        if ($chat->getAuthor() !== $user && $chat->getReplyAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        return empty($chat)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($chat, context: ['groups' => ['chats:read']]);
    }
}
