<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteChatMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatMessageRepository  $chatMessageRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var ChatMessage $chatMessage */
        $chatMessage = $this->chatMessageRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$chatMessage)
            return $this->json(['message' => "Resource not found"], 404);

        if ($chatMessage->getAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $this->entityManager->remove($chatMessage);
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully removed'], 204);
    }
}
