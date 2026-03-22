<?php

namespace App\Controller\Api\CRUD\GET\Gallery;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Repository\Gallery\GalleryRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalGalleryFilterController extends AbstractApiController
{
    public function __construct(
        private readonly GalleryRepository $galleryRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $data = $this->galleryRepository->findUserGallery($this->checkedUser('double'));

        return empty($data)
            ? $this->errorJson(AppError::RESOURCE_NOT_FOUND)
            : $this->json($data, context: ['groups' => ['galleries:read']]);
    }
}
