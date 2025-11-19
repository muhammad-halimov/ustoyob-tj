<?php

namespace App\Controller\Api\Filter\Review\Masters;

use App\Entity\User;
use App\Repository\ReviewRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MasterReviewFilterController extends AbstractController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
        private readonly UserRepository   $userRepository,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        $data = $this->reviewRepository->findReviewsByTypeAndRole($user, 'master', '%ROLE_MASTER%');

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['reviews:read']]);
    }
}
