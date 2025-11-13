<?php

namespace App\Controller\Api\Filter\Geography;

use App\Repository\DistrictRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UpdateDistrictPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly DistrictRepository     $districtRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        if ($imageFile = $request->files->get('imageFile')) {
            $district = $this->districtRepository->find($id);
            if (!$district) return $this->json(['message' => 'District not found'], 404);

            $district->setImageFile($imageFile);

            $this->entityManager->persist($district);
            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $district->getId(),
                'image' => $district->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
