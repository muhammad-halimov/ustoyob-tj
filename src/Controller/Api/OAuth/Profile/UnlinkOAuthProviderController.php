<?php

namespace App\Controller\Api\OAuth\Profile;

use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Service\Extra\AccessService;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UnlinkOAuthProviderController extends AbstractController
{
    public function __construct(
        private readonly Security                    $security,
        private readonly AccessService               $accessService,
        private readonly EntityManagerInterface      $entityManager,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->security->getUser();
        $this->accessService->check($currentUser);

        $provider = (string) $request->attributes->get('provider', '');

        /** @var OAuthProvider|null $providerEntity */
        $providerEntity = $currentUser->getOauthProviders()
            ->filter(fn(OAuthProvider $p) => $p->getProvider() === $provider)
            ->first() ?: null;

        if ($providerEntity === null) {
            return $this->json(['error' => 'not_linked'], 400);
        }

        $hasPassword      = !empty($currentUser->getPassword());
        $hasOtherProvider = $currentUser->getOauthProviders()->count() > 1;

        if (!$hasPassword && !$hasOtherProvider) {
            return $this->json(['error' => 'last_auth_method'], 400);
        }

        $currentUser->removeOauthProvider($providerEntity);
        $this->entityManager->remove($providerEntity);
        $this->entityManager->flush();

        $remaining = array_map(
            fn(OAuthProvider $p) => [
                'provider' => $p->getProvider(),
                'linkedAt' => $p->getCreatedAt()->format(DateTimeInterface::ATOM),
            ],
            array_filter(
                $currentUser->getOauthProviders()->toArray(),
                fn(OAuthProvider $p) => $p->getId() !== $providerEntity->getId()
            )
        );

        return $this->json(['providers' => array_values($remaining)]);
    }
}
