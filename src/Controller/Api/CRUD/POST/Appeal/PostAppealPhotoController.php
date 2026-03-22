<?php

namespace App\Controller\Api\CRUD\POST\Appeal;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\POST\Image\AbstractPhotoUploadController;
use App\Entity\Appeal\Appeal;
use App\Entity\Extra\MultipleImage;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostAppealPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->appealRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Appeal $entity */
        $author     = $entity->getAuthor();
        $respondent = $entity->getRespondent();

        // anonymous appeal: only respondent can upload
        if ($author === null) {
            if ($respondent !== $bearerUser)
                return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
            return null;
        }

        if ($author !== $bearerUser && $respondent !== $bearerUser)
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Appeal $entity */
        $appealImage = (new MultipleImage())->setImageFile($imageFile);
        $entity->addImage($appealImage);
        $this->entityManager->persist($appealImage);
    }

    protected function getEntityName(): string
    {
        return Appeal::class;
    }
}
