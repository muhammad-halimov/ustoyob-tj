<?php

namespace App\Controller\Api\OAuth\Telegram;

use App\Dto\OAuth\GeneralCallbackOutput;
use App\Entity\User;
use App\Entity\UserOAuthProvider;
use App\Repository\UserRepository;
use App\Service\Auth\RefreshTokenService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\Cache\CacheInterface;

class TelegramLinkEmailController extends AbstractController
{
    public function __construct(
        private readonly CacheInterface           $cache,
        private readonly UserRepository           $userRepository,
        private readonly EntityManagerInterface   $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenService      $refreshTokenService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $body      = json_decode($request->getContent(), true) ?? [];
        $tempToken = (string) ($body['temp_token'] ?? '');
        $email     = trim((string) ($body['email'] ?? ''));

        if ($tempToken === '') {
            throw new BadRequestHttpException('temp_token is required');
        }

        $cacheKey = 'telegram_pending_' . $tempToken;

        if (!$this->cache->hasItem($cacheKey)) {
            throw new BadRequestHttpException('Invalid or expired temp_token');
        }

        /** @var string $rawData */
        $rawData      = $this->cache->getItem($cacheKey)->get();
        $telegramData = json_decode($rawData, true);
        $telegramId   = (string) $telegramData['telegramId'];
        $role         = $telegramData['role'] ?? 'user';

        if ($email === '') {
            $email = "oauth+telegram_{$telegramId}@internal.local";
        }

        // Prevent linking if this Telegram account is already linked to another account
        if ($this->userRepository->findByOAuthProvider('telegram', $telegramId) !== null) {
            $this->cache->deleteItem($cacheKey);
            throw new BadRequestHttpException('This Telegram account is already linked to another user');
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);
        if ($user === null) {
            $user = (new User())
                ->setEmail($email)
                ->setName($telegramData['firstName'] ?? '')
                ->setSurname($telegramData['lastName'] ?? '')
                ->setLogin($telegramData['username'] ?? null)
                ->setImageExternalUrl($telegramData['photoUrl'] ?? '')
                ->setPassword('')
                ->setActive(true)
                ->setApproved(true)
                ->setGender('gender_neutral')
                ->setRoles(match($role) {
                    'master' => ['ROLE_MASTER'],
                    'client' => ['ROLE_CLIENT'],
                    default  => ['ROLE_USER'],
                });
            $this->entityManager->persist($user);
        }

        $provider = (new UserOAuthProvider())
            ->setProvider('telegram')
            ->setProviderId($telegramId)
            ->setUser($user);
        $this->entityManager->persist($provider);
        $this->entityManager->flush();

        $this->cache->deleteItem($cacheKey);

        $output        = new GeneralCallbackOutput();
        $output->user  = $user;
        $output->token = $this->jwtManager->create($user);

        $refreshTokenValue = $this->refreshTokenService->createRefreshToken($user);
        $response          = $this->json($output);
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie($refreshTokenValue));

        return $response;
    }
}
