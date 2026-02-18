<?php

namespace App\Controller\Api\CRUD\Review;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Review\Review;
use App\Entity\Review\ReviewImage;
use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostReviewPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface            $entityManager,
        Security                          $security,
        AccessService                     $accessService,
        private readonly ReviewRepository $reviewRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->reviewRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Review $entity */
        if ($entity->getClient() !== $bearerUser && $entity->getMaster() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 403);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Review $entity */
        $entityImage = (new ReviewImage())->setImageFile($imageFile);
        $entity->addReviewImage($entityImage);
        $this->entityManager->persist($entityImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(Review::class))->getName();
    }
}
