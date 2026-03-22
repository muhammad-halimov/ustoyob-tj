<?php

namespace App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\TechSupport\TechSupport;
use App\Repository\TechSupport\TechSupportRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchTechSupportController extends AbstractApiController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');

        $techSupport = $this->techSupportRepository->find($id);
        if (!$techSupport) return $this->errorJson(AppError::TECH_SUPPORT_NOT_FOUND);

        if ($techSupport->getAuthor() !== $bearerUser && $techSupport->getAdministrant() !== $bearerUser) {
            return $this->errorJson(AppError::EXTRA_DENIED);
        }

        $data = json_decode($request->getContent(), true);
        $statusParam = $data['status'] ?? null;

        if (!$statusParam || !in_array($statusParam, array_values(TechSupport::STATUSES), true)) {
            return $this->errorJson(AppError::WRONG_TECH_SUPPORT_STATUS);
        }

        if ($statusParam === 'in_progress' && !in_array('ROLE_ADMIN', $bearerUser->getRoles(), true)) {
            return $this->errorJson(AppError::EXTRA_DENIED);
        }

        $techSupport->setStatus($statusParam);
        $this->flush();

        return $this->json($techSupport, context: ['groups' => ['techSupport:read']]);
    }
}
