<?php

namespace App\Controller\Api\Filter\User\Master;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class MastersOccupationUserFilterController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $occupations */
        $occupations = $this->userRepository->findByOccupationId($id);

        return empty($occupations)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($occupations, context: ['groups' => ['masters:read']]);
    }
}
