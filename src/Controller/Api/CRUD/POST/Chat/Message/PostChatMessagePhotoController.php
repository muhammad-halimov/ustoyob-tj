<?php

namespace App\Controller\Api\CRUD\POST\Chat\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\POST\Image\AbstractPhotoUploadController;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostChatMessagePhotoController extends AbstractPhotoUploadController
{
    public function __construct(private readonly ChatMessageRepository $chatMessageRepository) {}

    protected function findEntity(int $id): ?object
    {
        return $this->chatMessageRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        $chat = $entity->getChat();

        if (!$chat) {
            return $this->errorJson(AppError::CHAT_NOT_FOUND);
        }

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }

        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var ChatMessage $entity */
        $chatImage = (new MultipleImage())
            ->setImageFile($imageFile)
            ->setAuthor($bearerUser);
        $entity->addChatImage($chatImage);
        $this->entityManager->persist($chatImage);
        // Touch ChatMessage so Doctrine fires postUpdate → Mercure SSE event
        $entity->setUpdatedAt();
    }

    protected function getEntityName(): string
    {
        return ChatMessage::class;
    }

    protected function performAdditionalChecks(object $entity): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        $chat = $entity->getChat();

        if ($chat) {
            $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());
        }

        return null;
    }
}
