<?php

namespace App\Controller\Api\CRUD\PATCH\Gallery;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Extra\MultipleImage;
use App\Repository\Gallery\GalleryRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchGalleryController extends AbstractApiController
{
    public function __construct(
        private readonly GalleryRepository $galleryRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');

        $galleryEntity = $this->galleryRepository->findUserGallery($bearerUser);

        if (!$galleryEntity)
            return $this->errorJson(AppError::GALLERY_NOT_FOUND);

        $data = $this->getContent();

        if (!isset($data['images']))
            return $this->errorJson(AppError::INVALID_JSON);

        $images = $data['images'];
        $incomingNames = array_filter(array_column($images, 'image'));

        foreach ($galleryEntity->getImages()->toArray() as $existingImage) {
            if (!in_array($existingImage->getImage(), $incomingNames, true)) {
                $galleryEntity->removeImage($existingImage);
                $this->entityManager->remove($existingImage);
            }
        }

        $existingByName = [];
        foreach ($galleryEntity->getImages() as $existingImage) {
            if ($existingImage->getImage()) {
                $existingByName[$existingImage->getImage()] = $existingImage;
            }
        }

        foreach ($images as $position => $imageData) {
            $imagePath = $imageData['image'] ?? null;
            if (!$imagePath) continue;

            if (isset($existingByName[$imagePath])) {
                $existingByName[$imagePath]->setPosition($position);
            } else {
                $galleryImage = (new MultipleImage())
                    ->setImage($imagePath)
                    ->setPosition($position);
                $galleryEntity->addImage($galleryImage);
                $this->entityManager->persist($galleryImage);
            }
        }

        $this->flush();

        return $this->json($galleryEntity, context: ['groups' => ['galleries:read']]);
    }
}
