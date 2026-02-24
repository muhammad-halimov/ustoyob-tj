<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class ChatMessageFilterController extends AbstractController
{
    public function __construct(
        private readonly ChatMessageRepository $chatMessageRepository,
        private readonly AccessService         $accessService,
        private readonly Security              $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var ChatMessage|null $chatMessage */
        $chatMessage = $this->chatMessageRepository->find($id);

        if (!$chatMessage)
            return $this->json(['message' => 'Resource not found'], 404);

        $chat = $chatMessage->getChat();

        if (!$chat)
            return $this->json(['message' => 'Chat not found'], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
