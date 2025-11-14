<?php

namespace App\Controller\Api\Filter\Review;

use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ClientReviewFilterController extends AbstractController
{
    private readonly ReviewRepository $reviewRepository;
    private readonly UserRepository $userRepository;

    public function __construct(
        ReviewRepository  $reviewRepository,
        UserRepository    $userRepository
    )
    {
        $this->reviewRepository = $reviewRepository;
        $this->userRepository = $userRepository;
    }

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->userRepository->find($id);
            if (!$user) return $this->json(['message' => 'User not found'], 404);

            $userRoles = $user->getRoles() ?? [];
            $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

            if (!array_intersect($allowedRoles, $userRoles))
                return $this->json(['message' => 'Access denied'], 403);

            $data = $this->reviewRepository->findUserReviewsByClientRole($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['reviewsClient:read'],
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
