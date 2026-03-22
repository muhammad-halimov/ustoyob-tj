<?php

namespace App\Controller\Api\CRUD\GET\Review;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Review\Review;
use App\Repository\Review\ReviewRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalReviewFilterController extends AbstractApiController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var Review $data */
        $data = $this->reviewRepository->findUserReviews($this->checkedUser());

        return empty($data)
            ? $this->errorJson(AppError::RESOURCE_NOT_FOUND)
            : $this->json($data, context: ['groups' => ['reviews:read', 'reviewsClient:read']]);
    }
}
