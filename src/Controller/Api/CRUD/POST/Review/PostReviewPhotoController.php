<?php

namespace App\Controller\Api\CRUD\POST\Review;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractPhotoUploadController;
use App\Entity\Extra\MultipleImage;
use App\Entity\Review\Review;
use App\Entity\User;
use App\Repository\Review\ReviewRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostReviewPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->reviewRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Review $entity */
        if ($entity->getClient() !== $bearerUser && $entity->getMaster() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Review $entity */
        $entityImage = (new MultipleImage())->setImageFile($imageFile);
        $entity->addReviewImage($entityImage);
        $this->entityManager->persist($entityImage);
    }

    protected function getEntityName(): string
    {
        return Review::class;
    }
}
