<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostChatMessagePhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface $entityManager,
        Security $security,
        AccessService $accessService,
        private readonly ChatMessageRepository $chatMessageRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->chatMessageRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        $chat = $entity->getChat();

        if (!$chat) {
            return $this->json(['message' => 'Chat not found'], 404);
        }

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 403);
        }

        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var ChatMessage $entity */
        $chatImage = (new ChatImage())
            ->setImageFile($imageFile)
            ->setAuthor($bearerUser);
        $entity->addChatImage($chatImage);
        $this->entityManager->persist($chatImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(ChatMessage::class))->getName();
    }

    protected function performAdditionalChecks(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        $chat = $entity->getChat();

        if ($chat) {
            $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());
        }

        return null;
    }
}
