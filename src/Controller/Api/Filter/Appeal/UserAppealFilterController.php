<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\User;
use App\Repository\User\AppealRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class UserAppealFilterController extends AbstractController
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

        try {
            /** @var User $appeal */
            $appeal = $this->appealRepository->findAllByTicketStatus(false);
            if (!$appeal) return $this->json([], 404);

            return empty($appeal)
                ? $this->json([], 404)
                : $this->json($appeal, 200, [],
                    [
                        'groups' => ['appeals:read'],
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
