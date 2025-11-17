<?php

namespace App\Controller\Api\Filter\User\Client;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ClientUserFilterController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->userRepository->findOneByRole("ROLE_CLIENT", $id);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        return empty($user)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($user, context: ['groups' => ['clients:read']]);
    }
}
