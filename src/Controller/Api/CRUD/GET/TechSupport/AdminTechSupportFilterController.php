<?php

namespace App\Controller\Api\CRUD\GET\TechSupport;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Repository\User\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class AdminTechSupportFilterController extends AbstractApiController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly UserRepository        $userRepository,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->userRepository->find($id);

        if (!$bearerUser)
            return $this->errorJson(AppError::USER_NOT_FOUND);

        /** @var TechSupport $techSupport */
        $techSupport = $this->techSupportRepository->findTechSupportsByAdmin($bearerUser);

        return empty($techSupport)
            ? $this->errorJson(AppError::RESOURCE_NOT_FOUND)
            : $this->json($techSupport, context: ['groups' => ['techSupport:read']]);
    }
}
