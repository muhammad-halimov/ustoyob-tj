<?php

namespace App\Controller\Api\Filter\User;

use App\Repository\User\OccupationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UpdateOccupationPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly OccupationRepository   $occupationRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        if ($imageFile = $request->files->get('imageFile')) {
            $occupation = $this->occupationRepository->find($id);
            if (!$occupation) return $this->json(['message' => 'Occupation not found'], 404);

            $occupation->setImageFile($imageFile);

            $this->entityManager->persist($occupation);
            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $occupation->getId(),
                'image' => $occupation->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
