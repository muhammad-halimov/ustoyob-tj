<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class AdminAppealFilterController extends AbstractController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly UserRepository   $userRepository,
        private readonly Security         $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN"];
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        try {
            /** @var Appeal $appeal */
            $appeal = $this->appealRepository->findTechSupportsByUser(false, $user, "support");
            if (!$appeal) return $this->json([], 404);

            return empty($appeal)
                ? $this->json([], 404)
                : $this->json($appeal, 200, [],
                    [
                        'groups' => ['appealsSupport:read'],
                        'skip_null_values' => false,
                    ]
                );
        } catch (Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }
}
