<?php

namespace App\Controller\Api\Filter\Chat;

use App\Repository\Chat\ChatMessageRepository;
use App\Repository\Chat\ChatRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly ChatMessageRepository  $chatMessageRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        if ($imageFile = $request->files->get('imageFile')) {
            $chat = $this->chatRepository->find($id);
            if (!$chat) return $this->json(['message' => 'District not found'], 404);

            $chatMessage = $this->chatMessageRepository->findOneBy([], ['id' => 'DESC']);
            $chatMessage->setImageFile($imageFile);

            $chat->addMessage($chatMessage);

            $this->entityManager->persist($chat);
            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $chat->getId(),
                'image' => $chatMessage->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
