<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostUserPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface $entityManager,
        Security $security,
        AccessService $accessService,
        private readonly UserRepository $userRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    // Специальный случай - возвращаем кастомный ответ
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $response = parent::__invoke($id, $request);

        // Если успешно, добавляем URL изображения
        if ($response->getStatusCode() === 200) {
            $user = $this->userRepository->find($id);
            return $this->json([
                'id' => $user->getId(),
                'image' => $user->getImage(),
                'message' => 'Photo updated successfully'
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
        /** @var User $entity */
        if ($entity !== $bearerUser) {
            return $this->json(["message" => "Ownership doesn't match"], 404);
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
