<?php

namespace App\Controller\Api\Auth;

use Doctrine\Persistence\ManagerRegistry;
use Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Http\Event\LogoutEvent;

class ApiLogoutController extends AbstractController
{
    public function __construct(
        private readonly RefreshTokenManagerInterface $refreshTokenManager,
        private readonly ManagerRegistry              $doctrine
    ) {}

    public function __invoke(Request $request, EventDispatcherInterface $eventDispatcher, TokenStorageInterface $tokenStorage): JsonResponse
    {
        $token = $tokenStorage->getToken();

        if (!$token)
            return new JsonResponse(['success' => false, 'message' => 'Token not found'], 401);

        $user = $token->getUser();

        if (!$user)
            return new JsonResponse(['success' => false, 'message' => 'User not found'], 401);

        // Диспатчим событие logout — для Lexik blocklist токен попадёт автоматически
        $eventDispatcher->dispatch(new LogoutEvent($request, $token));

        // Инвалидация refresh-токенов через Gesdinet
        $refreshTokens = $this->doctrine
            ->getRepository(RefreshToken::class)
            ->findBy(['username' => $user->getUserIdentifier()]);

        foreach ($refreshTokens as $rt) $this->refreshTokenManager->delete($rt);

        return new JsonResponse(['success' => true]);
    }
}
