<?php

namespace App\Controller\Api\CRUD\POST\Gallery;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractPhotoUploadController;
use App\Entity\Extra\MultipleImage;
use App\Entity\Gallery\Gallery;
use App\Entity\User;
use App\Repository\Gallery\GalleryRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostGalleryPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly GalleryRepository $galleryRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->galleryRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Gallery $entity */
        if ($entity->getUser() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Gallery $entity */
        $position = $entity->getImages()->count();
        $galleryImage = (new MultipleImage())->setImageFile($imageFile)->setPosition($position);
        $entity->addImage($galleryImage);
        $this->entityManager->persist($galleryImage);
    }

    protected function getEntityName(): string
    {
        return Gallery::class;
    }
}
