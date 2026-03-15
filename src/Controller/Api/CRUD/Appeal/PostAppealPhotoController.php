<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostAppealPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface            $entityManager,
        Security                          $security,
        AccessService                     $accessService,
        private readonly AppealRepository $appealRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

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
                return $this->json(['message' => "Ownership doesn't match"], 403);
            return null;
        }

        if ($author !== $bearerUser && $respondent !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Appeal $entity */
        $appealImage = (new AppealImage())->setImageFile($imageFile);
        $entity->addImage($appealImage);
        $this->entityManager->persist($appealImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(Appeal::class))->getName();
    }
}
