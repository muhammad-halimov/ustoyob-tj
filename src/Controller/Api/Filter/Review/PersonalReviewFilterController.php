<?php

namespace App\Controller\Api\Filter\Review;

use App\Entity\Review\Review;
use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Service\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalReviewFilterController extends AbstractController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
        private readonly AccessService    $accessService,
        private readonly Security         $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Review $data */
        $data = $this->reviewRepository->findUserReviews($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['reviews:read', 'reviewsClient:read']]);
    }
}
