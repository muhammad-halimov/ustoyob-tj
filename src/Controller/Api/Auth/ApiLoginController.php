<?php

namespace App\Controller\Api\Auth;

use App\Dto\ApiAuth\ApiLogin\LoginInput;
use App\Repository\UserRepository;
use App\Service\Auth\RefreshTokenService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ApiLoginController extends AbstractController
{
    public function __invoke(
        #[MapRequestPayload] LoginInput $input,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager,
        RefreshTokenService $refreshTokenService
    ): JsonResponse
    {
        $user = $userRepository->findOneBy(['email' => $input->email]);

        if (!$user) throw new UnauthorizedHttpException('', 'Invalid credentials');

        $oauthType = $user->getOauthType();

        // Проверка пароля
        if ($oauthType !== null && $oauthType->hasAnyProvider()) {
            // Пользователь зарегистрирован через OAuth - запрещаем вход по паролю
            throw new UnauthorizedHttpException('', 'This account uses OAuth authentication. Please login via: ' . implode(', ', $oauthType->getActiveProviders()));
        }

        // Обычная регистрация - пароль обязателен
        if (empty($input->password)) {
            throw new UnauthorizedHttpException('', 'Password is required');
        }

        if (empty($user->getPassword()) || !$passwordHasher->isPasswordValid($user, $input->password)) {
            throw new UnauthorizedHttpException('', 'Invalid credentials');
        }

        // Создаем JWT
        $token = $jwtManager->create($user);

        // Создаем refresh token
        /** @var Cookie $refreshTokenValue */
        $refreshTokenValue = $refreshTokenService->createRefreshToken($user);

        // Создаем response
        $response = new JsonResponse(['token' => $token, 'refresh_token_expiration' => (int)$_ENV['REFRESH_TOKEN_EXPIRATION']]);
        $response->headers->setCookie($refreshTokenService->createRefreshTokenCookie($refreshTokenValue));

        return $response;
    }
}
