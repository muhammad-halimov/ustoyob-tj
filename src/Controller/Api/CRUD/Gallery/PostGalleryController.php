<?php

namespace App\Controller\Api\CRUD\Gallery;

use App\Entity\Gallery\Gallery;
use App\Entity\User;
use App\Repository\GalleryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostGalleryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GalleryRepository      $galleryRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if ($this->galleryRepository->findUserGallery($user))
            return $this->json(['message' => "This user has gallery, patch instead"], 400);

        $this->entityManager->persist((new Gallery())->setUser($user));
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully posted']);
    }
}
