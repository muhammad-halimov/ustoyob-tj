<?php

namespace App\Controller\Api\CRUD\POST\Chat\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\POST\Image\AbstractPhotoUploadController;
use App\Entity\Chat\Chat;
use App\Entity\Extra\MultipleImage;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostChatPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->chatRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Chat $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getReplyAuthor() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Chat $entity */
        $chatImage = (new MultipleImage())
            ->setImageFile($imageFile)
            ->setAuthor($bearerUser);
        $entity->addChatImage($chatImage);
        $this->entityManager->persist($chatImage);
    }

    protected function getEntityName(): string
    {
        return Chat::class;
    }

    protected function performAdditionalChecks(object $entity): ?JsonResponse
    {
        /** @var Chat $entity */
        $this->accessService->checkBlackList($entity->getAuthor(), $entity->getReplyAuthor());
        return null;
    }
}
