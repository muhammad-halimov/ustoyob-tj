<?php

namespace App\Controller\Api\OAuth\Profile;

use App\Entity\User;
use App\Entity\UserOAuthProvider;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class GetOAuthProvidersController extends AbstractController
{
    public function __construct(
        private readonly Security      $security,
        private readonly AccessService $accessService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->security->getUser();
        $this->accessService->check($currentUser);

        $providers = array_map(
            fn(UserOAuthProvider $p) => [
                'provider' => $p->getProvider(),
                'linkedAt' => $p->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            $currentUser->getOauthProviders()->toArray()
        );

        return $this->json($providers);
    }
}
