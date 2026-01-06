<?php

namespace App\Controller\Api\CRUD\Chat\Chat;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostChatPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface $entityManager,
        Security $security,
        AccessService $accessService,
        private readonly ChatRepository $chatRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->chatRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Chat $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getReplyAuthor() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 403);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Chat $entity */
        $chatImage = (new ChatImage())
            ->setImageFile($imageFile)
            ->setAuthor($bearerUser);
        $entity->addChatImage($chatImage);
        $this->entityManager->persist($chatImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(Chat::class))->getName();
    }

    protected function performAdditionalChecks(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Chat $entity */
        $this->accessService->checkBlackList($entity->getAuthor(), $entity->getReplyAuthor());
        return null;
    }
}
