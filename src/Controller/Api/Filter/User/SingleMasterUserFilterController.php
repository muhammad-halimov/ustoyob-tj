<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SingleMasterUserFilterController extends AbstractController
{
    private readonly UserRepository $userRepository;

    public function __construct(
        UserRepository    $userRepository
    )
    {
        $this->userRepository = $userRepository;
    }

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->userRepository->findOneByRole("ROLE_MASTER", $id);
            if (!$user) return $this->json([], 404);

            return empty($user)
                ? $this->json([], 404)
                : $this->json($user, 200, [],
                    [
                        'groups' => ['masters:read'],
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
