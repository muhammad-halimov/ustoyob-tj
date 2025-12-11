<?php

namespace App\Controller\Api\Filter\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Repository\UserRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class AdminTechSupportFilterController extends AbstractController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly UserRepository        $userRepository,
        private readonly AccessService         $accessService,
        private readonly Security              $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'admin');

        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        /** @var TechSupport $techSupport */
        $techSupport = $this->techSupportRepository->findTechSupportsByAdmin($user);

        return empty($techSupport)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($techSupport, context: ['groups' => ['techSupport:read']]);
    }
}
