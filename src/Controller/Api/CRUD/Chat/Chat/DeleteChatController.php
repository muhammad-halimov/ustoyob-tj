<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteChatController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Chat $chat */
        $chat = $this->chatRepository->find($id);

        if (!$chat) return $this->json(['message' => "Resource not found"], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $this->entityManager->remove($chat);
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully removed'], 204);
    }
}
