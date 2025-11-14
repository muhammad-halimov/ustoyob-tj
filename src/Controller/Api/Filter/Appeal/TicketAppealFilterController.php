<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class TicketAppealFilterController extends AbstractController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly Security         $security,
    ){}

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        try {
            /** @var Appeal $appeals */
            $appeals = $this->appealRepository->findAppealsByStatusAndType(true, $user, 'complaint');
            if (!$appeals) return $this->json([], 404);

            return empty($appeals)
                ? $this->json([], 404)
                : $this->json($appeals, 200, [],
                    [
                        'groups' => ['appealsTicket:read'],
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
