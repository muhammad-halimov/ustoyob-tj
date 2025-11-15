<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\Chat\ChatImage;
use App\Repository\Chat\ChatRepository;
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
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $user = $this->security->getUser();

        $userRoles = $user?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $chat = $this->chatRepository->find($id);
        if (!$chat) return $this->json(['message' => 'Chat not found'], 404);

        if ($chat->getAuthor() !== $user && $chat->getReplyAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $imageFiles = $request->files->get('imageFile');
        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        $imageFiles = is_array($imageFiles) ?
            $imageFiles :
            [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $chatImage = (new ChatImage())
                    ->setImageFile($imageFile)
                    ->setAuthor($user);
                $chat->addChatImage($chatImage);
                $this->entityManager->persist($chatImage);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
