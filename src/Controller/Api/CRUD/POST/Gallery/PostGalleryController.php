<?php

namespace App\Controller\Api\CRUD\POST\Gallery;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Gallery\Gallery;
use App\Repository\Gallery\GalleryRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostGalleryController extends AbstractApiController
{
    public function __construct(
        private readonly GalleryRepository      $galleryRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');

        if ($this->galleryRepository->findUserGallery($bearerUser))
            return $this->errorJson(AppError::GALLERY_EXISTS_PATCH_INSTEAD);

        $gallery = (new Gallery())->setUser($bearerUser);

        $this->persist($gallery);

        return $this->json($gallery, context: ['groups' => ['galleries:read'], 'skip_null_values' => false]);
    }
}
