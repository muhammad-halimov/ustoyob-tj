<?php

namespace App\Controller\Api\Filter\Gallery;

use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MasterGalleryFilterController extends AbstractController
{
    public function __construct(
        private readonly GalleryRepository $galleryRepository,
        private readonly UserRepository    $userRepository,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $data = $this->galleryRepository->findUserGallery($user);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['galleries:read']]);
    }
}
