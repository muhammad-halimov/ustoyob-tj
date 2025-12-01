<?php

namespace App\Controller\Api\CRUD\Gallery;

use App\Entity\Gallery\Gallery;
use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Service\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostGalleryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GalleryRepository      $galleryRepository,
        private readonly AccessService     $accessService,
        private readonly Security          $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        if ($this->galleryRepository->findUserGallery($bearerUser))
            return $this->json(['message' => "This user has gallery, patch instead"], 400);

        $this->entityManager->persist((new Gallery())->setUser($bearerUser));
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully posted']);
    }
}
