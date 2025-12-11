<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = json_decode($request->getContent(), true);

        /** @var Chat $chat */
        $chat = $this->chatRepository->find($id);

        if (!$chat) return $this->json(['message' => "Resource not found"], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chat->setActive((bool)$data['active']);

        $this->entityManager->flush();

        return $this->json(['message' => "Resource updated successfully"]);
    }
}
