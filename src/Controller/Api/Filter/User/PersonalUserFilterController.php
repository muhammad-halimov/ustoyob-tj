<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalUserFilterController extends AbstractController
{
    public function __construct(
        private readonly AccessService $accessService,
        private readonly Security      $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, activeAndApproved: false);

        return empty($bearerUser)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($bearerUser, context: ['groups' => ['masters:read', 'clients:read', 'users:me:read']]);
    }
}
