<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\Ticket\Category;
use App\Repository\CategoryRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class CategoryOccupationFilterController extends AbstractController
{
    public function __construct(
        private readonly CategoryRepository $categoryRepository,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var Category[] $data */
        $data = $this->categoryRepository->findBy(['occupations' => $id]);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['categories:read']]);
    }
}
