<?php

namespace App\Controller\Api\Filter\Appeal\Support;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class UserSupportFilterController extends AbstractController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly UserRepository   $userRepository,
        private readonly Security         $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$user)
            return $this->json(['message' => 'User not found'], 404);

        /** @var Appeal $appeal */
        $appeal = $this->appealRepository->findTechSupportsByClient(false, $user, "support");

        return empty($appeal)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($appeal, context: ['groups' => ['appealsSupport:read']]);
    }
}
