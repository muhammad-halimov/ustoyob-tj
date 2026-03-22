<?php

namespace App\Controller\Api\CRUD\GET\TechSupport;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Repository\TechSupport\TechSupportRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalTechSupportFilterController extends AbstractApiController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->techSupportRepository->findTechSupportsByUser($bearerUser)
            ?: $this->techSupportRepository->findTechSupportsByAdmin($bearerUser);

        if (empty($data)) return $this->errorJson(AppError::RESOURCE_NOT_FOUND);

        return $this->json($data, context: ['groups' => ['techSupport:read']]);
    }
}
