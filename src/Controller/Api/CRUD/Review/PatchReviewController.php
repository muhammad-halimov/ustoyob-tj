<?php

namespace App\Controller\Api\CRUD\Review;

use App\Entity\Review\Review;
use App\Entity\Review\ReviewImage;
use App\Entity\User;
use App\Repository\ReviewRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchReviewController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ReviewRepository       $reviewRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        /** @var Review $review */
        $review = $this->reviewRepository->find($id);

        if (!$review) return $this->json(['message' => 'Review not found'], 404);

        if ($bearerUser !== $review->getClient() && $bearerUser !== $review->getMaster())
            return $this->json(['message' => 'Access denied'], 403);

        $data = json_decode($request->getContent(), true);

        $ratingParam = (float)$data['rating'];
        $descriptionParam = $data['description'] ?? null;
        $imagesParam = $data['images'] ?? null;

        $imagesParam = $imagesParam ? (is_array($imagesParam) ? $imagesParam : [$imagesParam]) : [];

        // Проверка диапазона (например, от 1 до 5)
        if ($ratingParam < 1 || $ratingParam > 5) return $this->json(['message' => 'Rating must be between 1 and 5'], 400);

        foreach ($review->getReviewImages() as $img) {
            $review->removeReviewImage($img);
            $this->entityManager->remove($img);
        }

        $review
            ->setDescription($descriptionParam)
            ->setRating($ratingParam);

        foreach ($imagesParam as $image) {
            if ($image['image'] && $image['image'] !== "string")
                $review->addReviewImage((new ReviewImage())->setImage($image['image']));
        }

        $this->entityManager->flush();

        $message = [
            'id' => $review->getId(),
            'type' => $review->getType(),
            'rating' => $review->getRating(),
            'description' => $review->getDescription(),
            'images' => $review->getReviewImages()->map(fn($img) => ['image' => $img->getImage()])->toArray(),
            'ticket' => $review->getServices()
                ? "/api/tickets/{$review->getServices()->getId()}"
                : null,
            'master' => "/api/users/{$review->getMaster()->getId()}",
            'client' => "/api/users/{$review->getClient()->getId()}",
        ];

        return $this->json($message, 201);
    }
}
