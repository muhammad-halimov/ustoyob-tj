<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Chat $chat */
        $chat = $this->chatRepository->find($id);

        $imageFiles = $request->files->get('imageFile');

        if (!$chat)
            return $this->json(['message' => 'Chat not found'], 404);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $chatImage = (new ChatImage())
                    ->setImageFile($imageFile)
                    ->setAuthor($bearerUser);
                $chat->addChatImage($chatImage);
                $this->entityManager->persist($chatImage);
            }
        }

        $this->entityManager->flush();

        return $this->json([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
