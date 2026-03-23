<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\TechSupport;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractPhotoUploadController;
use App\Entity\Extra\MultipleImage;
use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostTechSupportPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->techSupportRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getAdministrant() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var TechSupport $entity */
        $tehcSupportImage = (new MultipleImage())->setImageFile($imageFile);
        $entity->addTechSupportImage($tehcSupportImage);
        $this->entityManager->persist($tehcSupportImage);
    }

    protected function getEntityName(): string
    {
        return TechSupport::class;
    }
}
