<?php

namespace App\Controller\Api\CRUD\TechSupport\TechSupport;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportImage;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostTechSupportPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface                 $entityManager,
        Security                               $security,
        AccessService                          $accessService,
        private readonly TechSupportRepository $techSupportRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->techSupportRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getAdministrant() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 400);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var TechSupport $entity */
        $reviewImage = (new TechSupportImage())->setImageFile($imageFile);
        $entity->addTechSupportImage($reviewImage);
        $this->entityManager->persist($reviewImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(TechSupport::class))->getName();
    }
}
