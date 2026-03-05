<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\UserPresenceService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users')]
class UserPresenceSubscribeController extends AbstractController
{
    public function __construct(
        private readonly Security            $security,
        private readonly AccessService       $accessService,
        private readonly UserPresenceService $presenceService,
    ) {}

    #[Route('/ping', name: 'api_users_ping', methods: ['POST'])]
    public function ping(): Response
    {
        $user = $this->security->getUser();

        if ($user instanceof User) {
            $this->accessService->check($user);
            $this->presenceService->markOnline($user);
        }

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/offline', name: 'api_users_offline', methods: ['POST'])]
    public function offline(): Response
    {
        $user = $this->security->getUser();

        if ($user instanceof User) {
            $this->presenceService->markOffline($user);
        }

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
