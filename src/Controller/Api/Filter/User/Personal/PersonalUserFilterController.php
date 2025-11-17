<?php

namespace App\Controller\Api\Filter\User\Personal;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalUserFilterController extends AbstractController
{
    public function __construct(
        private readonly Security $security
    ){}

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $user */
        $user = $this->security->getUser();

        return empty($user)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($user, context: ['groups' => ['masters:read', 'clients:read']]);
    }
}
