<?php

namespace App\Controller\Api\Filter\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class AdminTechSupportFilterController extends AbstractController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly UserRepository        $userRepository,
        private readonly Security              $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!in_array("ROLE_ADMIN", $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        /** @var TechSupport $techSupport */
        $techSupport = $this->techSupportRepository->findTechSupportsByAdmin($user);

        return empty($techSupport)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($techSupport, context: ['groups' => ['techSupport:read']]);
    }
}
