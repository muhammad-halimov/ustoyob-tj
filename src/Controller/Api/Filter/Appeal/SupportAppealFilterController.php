<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\Appeal\Appeal;
use App\Repository\User\AppealRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SupportAppealFilterController extends AbstractController
{
    private readonly AppealRepository $appealRepository;

    public function __construct(
        AppealRepository $appealRepository
    )
    {
        $this->appealRepository = $appealRepository;
    }

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        try {
            /** @var Appeal $appeal */
            $appeal = $this->appealRepository->findAllByTicketStatus("support");
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
