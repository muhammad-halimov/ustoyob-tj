<?php

namespace App\Controller\Api\CRUD\Review;

use App\Entity\Review\Review;
use App\Entity\Review\ReviewImage;
use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Service\Extra\AccessService;
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
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Review $review */
        $review = $this->reviewRepository->find($id);

        $imageFiles = $request->files->get('imageFile');

        if (!$review)
            return $this->json(['message' => 'Review not found'], 404);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($review->getClient() !== $bearerUser && $review->getMaster() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

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
