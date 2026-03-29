<?php

namespace App\Controller\Api\CRUD\PATCH\Gallery\Gallery;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\Gallery\GalleryPatchInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Gallery\Gallery;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchGalleryController extends AbstractApiPatchController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getInputClass(): string { return GalleryPatchInput::class; }

    protected function getEntityClass(): string { return Gallery::class; }

    protected function setSerializationGroups(): array { return G::OPS_GALLERIES; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Gallery $entity */
        if ($entity->getUser()) $this->localizationService->localizeUser($entity->getUser(), $this->getLocale());
    }

    protected function getEntityById(int $id): ?object
    {
        return $this->entityManager->find($this->getEntityClass(), $id);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var Gallery $entity */
        if ($entity->getUser() !== $bearer) return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var GalleryPatchInput $dto */
        if ($dto->images === null)
            return $this->errorJson(AppMessages::INVALID_JSON);

        $images        = $dto->images;
        $incomingNames = array_filter(array_column($images, 'image'));

        foreach ($entity->getImages()->toArray() as $existingImage) {
            if (!in_array($existingImage->getImage(), $incomingNames, true)) {
                $entity->removeImage($existingImage);
                $this->entityManager->remove($existingImage);
            }
        }

        $existingByName = [];
        foreach ($entity->getImages() as $existingImage) {
            if ($existingImage->getImage()) {
                $existingByName[$existingImage->getImage()] = $existingImage;
            }
        }

        foreach ($images as $position => $imageData) {
            $imagePath = $imageData['image'] ?? null;
            if (!$imagePath) continue;

            if (isset($existingByName[$imagePath])) {
                $existingByName[$imagePath]->setPriority($position);
            } else {
                $galleryImage = (new MultipleImage())
                    ->setImage($imagePath)
                    ->setPriority($position)
                    ->setAuthor($bearer);
                $entity->addImage($galleryImage);
                $this->entityManager->persist($galleryImage);
            }
        }

        return null;
    }
}
