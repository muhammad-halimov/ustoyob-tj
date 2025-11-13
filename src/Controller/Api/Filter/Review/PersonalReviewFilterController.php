<?php

namespace App\Controller\Api\Filter\Review;

use App\Entity\User;
use App\Repository\ReviewRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalReviewFilterController extends AbstractController
{
    private readonly Security $security;
    private readonly ReviewRepository $reviewRepository;

    public function __construct(
        Security          $security,
        ReviewRepository  $reviewRepository
    )
    {
        $this->security = $security;
        $this->reviewRepository = $reviewRepository;
    }

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->security->getUser();

            $userRoles = $user?->getRoles() ?? [];
            $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

            if (!array_intersect($allowedRoles, $userRoles))
                return $this->json(['message' => 'Access denied'], 403);

            $data = $this->reviewRepository->findUserReviewsById($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['reviews:read', 'reviewsClient:read'],
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
