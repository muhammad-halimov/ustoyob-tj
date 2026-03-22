<?php

namespace App\Controller\Api\CRUD\PATCH\Review;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Extra\MultipleImage;
use App\Entity\Review\Review;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchReviewController extends AbstractApiController
{
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        /** @var Review $review */
        $review = $this->findOr404(Review::class, $id, AppError::REVIEW_NOT_FOUND);

        if ($review instanceof JsonResponse)
            return $review;

        if ($bearerUser !== $review->getClient() && $bearerUser !== $review->getMaster())
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);

        $data = $this->getContent();

        $ratingParam = (float)$data['rating'];
        $descriptionParam = $data['description'] ?? null;
        $imagesParam = $data['images'] ?? null;

        $imagesParam = $imagesParam ? (is_array($imagesParam) ? $imagesParam : [$imagesParam]) : [];

        // Проверка диапазона (например, от 1 до 5)
        if ($ratingParam < 1 || $ratingParam > 5) return $this->errorJson(AppError::INVALID_RATING);

        foreach ($review->getImages() as $img) {
            $review->removeImage($img);
            $this->entityManager->remove($img);
        }

        $review
            ->setDescription($descriptionParam)
            ->setRating($ratingParam);

        foreach ($imagesParam as $image) {
            if ($image['image'] && $image['image'] !== "string")
                $review->addImage((new MultipleImage())->setImage($image['image']));
        }

        $this->flush();

        $message = [
            'id' => $review->getId(),
            'type' => $review->getType(),
            'rating' => $review->getRating(),
            'description' => $review->getDescription(),
            'images' => array_values($review->getImages()->map(fn($img) => ['image' => $img->getImage()])->toArray()),
            'ticket' => $review->getServices() ? "/api/tickets/{$review->getServices()->getId()}" : null,
            'master' => "/api/users/{$review->getMaster()->getId()}",
            'client' => "/api/users/{$review->getClient()->getId()}",
        ];

        return $this->json($message);
    }
}
