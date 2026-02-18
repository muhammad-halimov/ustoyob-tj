<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class ChatFilterController extends AbstractController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
        private readonly AccessService  $accessService,
        private readonly Security       $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Chat $chat */
        $chat = $this->chatRepository->find($id);

        if (!$chat)
            return $this->json(['message' => 'Chat not found'], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        return empty($chat)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($chat, context: ['groups' => ['chats:read']]);
    }
}
