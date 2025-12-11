<?php

namespace App\Controller\Api\Filter\Gallery;

use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalGalleryFilterController extends AbstractController
{
    public function __construct(
        private readonly GalleryRepository $galleryRepository,
        private readonly AccessService     $accessService,
        private readonly Security          $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        $data = $this->galleryRepository->findUserGallery($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['galleries:read']]);
    }
}
