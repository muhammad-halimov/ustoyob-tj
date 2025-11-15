<?php

namespace App\Controller\Api\Filter\Review;

use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MasterReviewFilterController extends AbstractController
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
        try {
            /** @var User $user */
            $user = $this->userRepository->find($id);
            if (!$user) return $this->json([], 404);

            $userRoles = $user->getRoles() ?? [];
            $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

            if (!array_intersect($allowedRoles, $userRoles))
                return $this->json(['message' => 'Access denied'], 403);

            $data = $this->reviewRepository->findMasterReviews($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['reviews:read'],
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
