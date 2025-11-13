<?php

namespace App\Controller\Api\Filter\Geography;

use App\Repository\CityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UpdateCityPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CityRepository         $cityRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        if ($imageFile = $request->files->get('imageFile')) {
            $city = $this->cityRepository->find($id);
            if (!$city) return $this->json(['message' => 'City not found'], 404);

            $city->setImageFile($imageFile);

            $this->entityManager->persist($city);
            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $city->getId(),
                'image' => $city->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
