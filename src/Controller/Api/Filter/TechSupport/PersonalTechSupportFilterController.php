<?php

namespace App\Controller\Api\Filter\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalTechSupportFilterController extends AbstractController
{
    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly AccessService         $accessService,
        private readonly Security              $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var TechSupport $data */
        $data = $this->techSupportRepository->findTechSupportsByUser($bearerUser)
            ? $this->techSupportRepository->findTechSupportsByUser($bearerUser)
            : $this->techSupportRepository->findTechSupportsByAdmin($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['techSupport:read']]);
    }
}
