<?php

namespace App\Controller\Api\Filter\Service;

use App\Repository\CategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UpdateCategoryPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CategoryRepository     $categoryRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        if ($imageFile = $request->files->get('imageFile')) {
            $category = $this->categoryRepository->find($id);
            if (!$category) return $this->json(['message' => 'Category not found'], 404);

            $category->setImageFile($imageFile);

            $this->entityManager->persist($category);
            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $category->getId(),
                'image' => $category->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
