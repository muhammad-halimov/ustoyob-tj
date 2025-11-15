<?php

namespace App\Controller\Api\Filter\Review;

use App\Entity\Review\ReviewImage;
use App\Repository\ReviewRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostReviewPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ReviewRepository       $reviewRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        $user = $this->security->getUser();
        $review = $this->reviewRepository->find($id);
        $imageFiles = $request->files->get('imageFile');

        if (!array_intersect($allowedRoles, $user?->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$review) return $this->json(['message' => 'Review not found'], 404);
        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        if ($review->getClient() !== $user && $review->getMaster() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $imageFiles = is_array($imageFiles) ?
            $imageFiles :
            [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $reviewImage = (new ReviewImage())->setImageFile($imageFile);
                $review->addReviewImage($reviewImage);
                $this->entityManager->persist($reviewImage);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
