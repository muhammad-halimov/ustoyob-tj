<?php

namespace App\Controller\Api\CRUD\Image;

use App\Entity\User;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

abstract class AbstractPhotoUploadController extends AbstractController
{
    public function __construct(
        protected readonly EntityManagerInterface $entityManager,
        protected readonly Security $security,
        protected readonly AccessService $accessService,
    ) {}

    /**
     * Главный метод для обработки загрузки фото
     */
    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

//        $accessLevel = $this->getAccessLevel();
        $this->accessService->check($bearerUser, 'double');

        $entity = $this->findEntity($id);

        if (!$entity) return $this->json(['message' => $this->getEntityName() . ' not found'], 404);

        $imageFiles = $request->files->get('imageFile');
        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];
        $uploadedCount = 0;

        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        $ownershipCheck = $this->checkOwnership($entity, $bearerUser);

        if ($ownershipCheck !== null) return $ownershipCheck;

        $additionalChecks = $this->performAdditionalChecks($entity, $bearerUser);

        if ($additionalChecks !== null) return $additionalChecks;

        foreach ($imageFiles as $imageFile)
            if ($imageFile instanceof UploadedFile && $imageFile->isValid()) {
                $this->processImageFile($entity, $imageFile, $bearerUser);
                $uploadedCount++;
            }

        $this->entityManager->flush();

        return $this->json([
            'message' => 'Photos uploaded successfully',
            'count' => $uploadedCount
        ]);
    }

    /**
     * Найти сущность по ID
     */
    abstract protected function findEntity(int $id): ?object;

    /**
     * Проверить владение сущностью
     */
    abstract protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse;

    /**
     * Обработать файл изображения
     */
    abstract protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void;

    /**
     * Получить название сущности для сообщений об ошибках
     */
    abstract protected function getEntityName(): string;

    /**
     * Получить уровень доступа ('normal', 'double', и т.д.)
     */
//    protected function getAccessLevel(): ?string
//    {
//        return 'double';
//    }

    /**
     * Дополнительные проверки (например, blacklist)
     */
    protected function performAdditionalChecks(object $entity, User $bearerUser): ?JsonResponse
    {
        return null;
    }
}
