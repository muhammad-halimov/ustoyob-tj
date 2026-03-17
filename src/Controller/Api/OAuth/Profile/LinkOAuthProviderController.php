<?php

namespace App\Controller\Api\OAuth\Profile;

use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Repository\User\UserOAuthProviderRepository;
use App\Service\Extra\AccessService;
use App\Service\OAuth\Google\GoogleOAuthService;
use App\Service\OAuth\Meta\Facebook\FacebookOAuthService;
use App\Service\OAuth\Meta\Instagram\InstagramOAuthService;
use App\Service\OAuth\StateStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;


class LinkOAuthProviderController extends AbstractController
{
    private const array VALID_PROVIDERS = ['google', 'facebook', 'instagram', 'telegram'];

    public function __construct(
        private readonly Security                    $security,
        private readonly AccessService               $accessService,
        private readonly EntityManagerInterface      $entityManager,
        private readonly UserOAuthProviderRepository $oauthProviderRepository,
        private readonly StateStorage                $stateStorage,
        private readonly GoogleOAuthService          $googleService,
        private readonly FacebookOAuthService        $facebookService,
        private readonly InstagramOAuthService       $instagramService,
        private readonly JWTTokenManagerInterface    $jwtManager,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->security->getUser();
        $this->accessService->check($currentUser);

        $body     = json_decode($request->getContent(), true) ?? [];
        $provider = (string) ($body['provider'] ?? '');

        if (!in_array($provider, self::VALID_PROVIDERS, true)) {
            throw new BadRequestHttpException('Invalid provider. Must be one of: ' . implode(', ', self::VALID_PROVIDERS));
        }

        ['id' => $providerId, 'email' => $realEmail] = $this->resolveProviderId($provider, $body);

        $existing = $this->oauthProviderRepository->findOneByProviderAndId($provider, $providerId);

        if ($existing !== null) {
            if ($existing->getUser()->getId() !== $currentUser->getId()) {
                return $this->json(['error' => 'provider_taken'], 400);
            }
            return $this->json(['error' => 'already_linked'], 400);
        }

        $emailUpdated = false;
        if ($realEmail !== null && str_contains($currentUser->getEmail(), '@internal.local')) {
            $currentUser->setEmail($realEmail);
            $emailUpdated = true;
        }

        $op = (new OAuthProvider())
            ->setProvider($provider)
            ->setProviderId($providerId)
            ->setUser($currentUser);
        $this->entityManager->persist($op);
        $this->entityManager->flush();

        $responseData = ['providers' => $this->buildProvidersList($currentUser)];

        if ($emailUpdated) {
            $responseData['new_token'] = $this->jwtManager->create($currentUser);
            $responseData['new_email'] = $currentUser->getEmail();
        }

        return $this->json($responseData);
    }

    private function resolveProviderId(string $provider, array $body): array
    {
        if ($provider === 'telegram') {
            $id       = (string) ($body['id'] ?? '');
            $hash     = (string) ($body['hash'] ?? '');
            $authDate = (int)    ($body['auth_date'] ?? 0);

            if ($id === '' || $hash === '') {
                throw new BadRequestHttpException('id and hash are required for Telegram');
            }
            if (time() - $authDate > 600) {
                throw new BadRequestHttpException('Expired Telegram auth data');
            }

            $this->verifyTelegramHash($body, $hash);

            return ['id' => $id, 'email' => null];
        }

        // Google / Facebook / Instagram — code + state flow
        $code  = (string) ($body['code'] ?? '');
        $state = (string) ($body['state'] ?? '');

        if ($code === '' || $state === '') {
            throw new BadRequestHttpException('code and state are required for ' . $provider);
        }

        if (!$this->stateStorage->has($state)) {
            throw new BadRequestHttpException('Invalid or expired state');
        }
        $this->stateStorage->remove($state);

        $service = match($provider) {
            'google'    => $this->googleService,
            'facebook'  => $this->facebookService,
            'instagram' => $this->instagramService,
        };

        $tokens   = $service->exchangeCodeForTokens($code);
        $userData = $service->fetchUserData($tokens);

        return match($provider) {
            'google'    => [
                'id'    => (string) $userData['sub'],
                'email' => ($userData['email_verified'] ?? false) ? ($userData['email'] ?? null) : null,
            ],
            'facebook'  => [
                'id'    => (string) $userData['id'],
                'email' => $userData['email'] ?? null,
            ],
            'instagram' => [
                'id'    => (string) $userData['id'],
                'email' => null,
            ],
        };
    }

    private function verifyTelegramHash(array $body, string $hash): void
    {
        $fields = [];
        foreach (['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'] as $key) {
            if (isset($body[$key]) && $body[$key] !== '' && $body[$key] !== null) {
                $fields[$key] = (string) $body[$key];
            }
        }
        ksort($fields);
        $dataCheckString = implode("\n", array_map(fn($k, $v) => "$k=$v", array_keys($fields), $fields));
        $secretKey       = hash('sha256', $_ENV['TELEGRAM_BOT_TOKEN'], true);
        if (!hash_equals(hash_hmac('sha256', $dataCheckString, $secretKey), $hash)) {
            throw new BadRequestHttpException('Invalid Telegram signature');
        }
    }

    private function buildProvidersList(User $user): array
    {
        return array_map(
            fn(OAuthProvider $p) => [
                'provider' => $p->getProvider(),
                'linkedAt' => $p->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            $user->getOauthProviders()->toArray()
        );
    }
}
