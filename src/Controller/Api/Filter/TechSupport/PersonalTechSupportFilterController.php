<?php

namespace App\Controller\Api\Filter\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalTechSupportFilterController extends AbstractController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly Security              $security,
    ){}

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        /** @var TechSupport $data */
        $data = $this->techSupportRepository->findTechSupportsByUser($bearerUser)
            ? $this->techSupportRepository->findTechSupportsByUser($bearerUser)
            : $this->techSupportRepository->findTechSupportsByAdmin($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['techSupport:read']]);
    }
}
