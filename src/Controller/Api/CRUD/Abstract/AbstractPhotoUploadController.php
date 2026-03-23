<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppError;
use App\Entity\User;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

abstract class AbstractPhotoUploadController extends AbstractApiController
{
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');

        $entity = $this->findEntity($id);

        if (!$entity)
            return $this->errorJson(AppError::RESOURCE_NOT_FOUND);

        $ownershipCheck = $this->checkOwnership($entity, $bearerUser);

        if ($ownershipCheck !== null)
            return $ownershipCheck;

        $additionalChecks = $this->performAdditionalChecks($entity);

        if ($additionalChecks !== null)
            return $additionalChecks;

        $imageFiles = $request->files->get('imageFile');

        if (!$imageFiles)
            return $this->errorJson(AppError::NO_FILES_PROVIDED);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];
        $uploadedCount = 0;

        foreach ($imageFiles as $imageFile)
            if ($imageFile instanceof UploadedFile && $imageFile->isValid()) {
                $this->processImageFile($entity, $imageFile, $bearerUser);
                $uploadedCount++;
            }

        $this->flush();

        return $this->json(['message' => 'Photos uploaded successfully', 'count' => $uploadedCount]);
    }

    abstract protected function findEntity(int $id): ?object;

    abstract protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse;

    abstract protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void;

    abstract protected function getEntityName(): string;

    protected function performAdditionalChecks(object $entity): ?JsonResponse { return null; }
}
