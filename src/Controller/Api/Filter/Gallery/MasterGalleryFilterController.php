<?php

namespace App\Controller\Api\Filter\Gallery;

use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class MasterGalleryFilterController extends AbstractController
{
    private readonly GalleryRepository $galleryRepository;
    private readonly UserRepository $userRepository;

    public function __construct(
        GalleryRepository $galleryRepository,
        UserRepository    $userRepository
    )
    {
        $this->galleryRepository = $galleryRepository;
        $this->userRepository = $userRepository;
    }

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->userRepository->find($id);

            $userRoles = $user?->getRoles() ?? [];
            $allowedRoles = ["ROLE_ADMIN", "ROLE_MASTER"];

            if (!array_intersect($allowedRoles, $userRoles))
                return $this->json(['message' => 'Access denied'], 403);

            if (!$user) return $this->json([], 404);

            $data = $this->galleryRepository->findUserGalleryById($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['galleries:read'],
                        'skip_null_values' => false,
                    ]
                );
        } catch (Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }
}
