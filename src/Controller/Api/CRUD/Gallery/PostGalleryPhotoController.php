<?php

namespace App\Controller\Api\CRUD\Gallery;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Gallery\Gallery;
use App\Entity\Gallery\GalleryImage;
use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostGalleryPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface             $entityManager,
        Security                           $security,
        AccessService                      $accessService,
        private readonly GalleryRepository $galleryRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->galleryRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Gallery $entity */
        if ($entity->getUser() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 403);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Gallery $entity */
        $galleryImage = (new GalleryImage())->setImageFile($imageFile);
        $entity->addUserServiceGalleryItem($galleryImage);
        $this->entityManager->persist($galleryImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(Gallery::class))->getName();
    }
}
