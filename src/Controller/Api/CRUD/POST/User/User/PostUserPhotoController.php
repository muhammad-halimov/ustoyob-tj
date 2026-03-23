<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractPhotoUploadController;
use App\Entity\User;
use App\Repository\User\UserRepository;
use ReflectionClass;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostUserPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $response = parent::__invoke($id, $request);

        if ($response->getStatusCode() === 200) {
            $user = $this->userRepository->find($id);
            return $this->json([
                'id' => $user->getId(),
                'image' => $user->getImage(),
                'message' => 'Photo updated successfully',
            ]);
        }

        return $response;
    }

    protected function findEntity(int $id): ?object
    {
        return $this->userRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        if ($entity !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var User $entity */
        $entity->setImageFile($imageFile);
        $this->entityManager->persist($entity);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(User::class))->getName();
    }
}
