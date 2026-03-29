<?php

namespace App\Controller\Api\Auth;

use App\ApiResource\AppMessages;
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
            return new JsonResponse(['success' => false, 'message' => AppMessages::get(AppMessages::TOKEN_NOT_FOUND)->message], AppMessages::get(AppMessages::TOKEN_NOT_FOUND)->http);

        $user = $token->getUser();

        if (!$user)
            return new JsonResponse(['success' => false, 'message' => AppMessages::get(AppMessages::USER_NOT_FOUND)->message], AppMessages::get(AppMessages::USER_NOT_FOUND)->http);

        // Диспатчим событие logout — для Lexik blocklist токен попадёт автоматически
        $eventDispatcher->dispatch(new LogoutEvent($request, $token));

        // Инвалидация refresh-токенов через Gesdinet
        $refreshTokens = $this->doctrine
            ->getRepository(RefreshToken::class)
            ->findBy(['username' => $user->getUserIdentifier()]);

        $deletedCount = 0;

        foreach ($refreshTokens as $rt) {
            $this->refreshTokenManager->delete($rt);
            $deletedCount++;
        }

        return new JsonResponse([
            'success' => true,
            'deleted_tokens' => $deletedCount
        ]);
    }
}
