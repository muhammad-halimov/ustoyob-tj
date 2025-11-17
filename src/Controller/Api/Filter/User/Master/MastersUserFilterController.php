<?php

namespace App\Controller\Api\Filter\User\Master;

use App\Entity\User;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MastersUserFilterController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $user */
        $user = $this->userRepository->findAllByRole("ROLE_MASTER");

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        return empty($user)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($user, context: ['groups' => ['masters:read']]);
    }
}
