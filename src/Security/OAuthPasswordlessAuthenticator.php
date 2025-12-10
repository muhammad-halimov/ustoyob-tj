<?php

namespace App\Security;

use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class OAuthPasswordlessAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private readonly UserRepository $userRepository
    ) {}

    public function supports(Request $request): ?bool
    {
        // Проверяем, что это POST на /api/authentication_token
        if ($request->getPathInfo() !== '/api/authentication_token' || !$request->isMethod('POST')) {
            return false;
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data) || !isset($data['email'])) {
            return false;
        }

        $email = $data['email'];
        $password = $data['password'] ?? null;

        // Ищем пользователя
        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            return false; // Пользователь не найден - пусть стандартный authenticator обработает
        }

        $oauthType = $user->getOauthType();

        // Поддерживаем ТОЛЬКО OAuth пользователей БЕЗ пароля в запросе
        $isOAuthUser = $oauthType !== null && $oauthType->hasAnyProvider();
        $noPasswordProvided = empty($password);

        return $isOAuthUser && $noPasswordProvided;
    }

    public function authenticate(Request $request): Passport
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'];

        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            throw new CustomUserMessageAuthenticationException('Invalid credentials');
        }

        // Проверяем еще раз, что это OAuth пользователь
        $oauthType = $user->getOauthType();
        if (!$oauthType || !$oauthType->hasAnyProvider()) {
            throw new CustomUserMessageAuthenticationException('Password is required');
        }

        // Возвращаем Self-Validating Passport (без проверки пароля)
        return new SelfValidatingPassport(
            new UserBadge($email, function ($identifier) {
                return $this->userRepository->findOneBy(['email' => $identifier]);
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // Возвращаем null, чтобы Lexik success handler обработал ответ
        // Он создаст JWT токен и refresh token куку
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // Возвращаем null, чтобы Lexik failure handler обработал ошибку
        return null;
    }
}
