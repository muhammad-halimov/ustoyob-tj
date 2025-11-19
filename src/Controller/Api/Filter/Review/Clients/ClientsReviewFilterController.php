<?php

namespace App\Controller\Api\Filter\Review\Clients;

use App\Repository\ReviewRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ClientsReviewFilterController extends AbstractController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $data = $this->reviewRepository->findReviewsByType('client', '%ROLE_CLIENT%');

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['reviewsClient:read']]);
    }
}
