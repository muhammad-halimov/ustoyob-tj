<?php

namespace App\Service\Auth;

use DateTime;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Управляет refresh-токенами для JWT-аутентификации.
 *
 * Как работает:
 *   JWT access-токен короткоживущий (обычно 15мин–час). Когда он истекает,
 *   клиент предъявляет refresh-токен (долгоживущий) и получает новый access.
 *
 * Стратегия cookie:
 *   Refresh-токен передаётся через HttpOnly-cookie, а не в JSON-теле.
 *   Это защищает от XSS-атак: скрипт на странице не может его прочитать.
 *
 * ENV-переменные (gesdinet_jwt_refresh_token.yaml и .env):
 *   REFRESH_TOKEN_TTL             — время жизни в секундах
 *   REFRESH_TOKEN_COOKIE_PATH     — путь (обычно /api/token/refresh)
 *   REFRESH_TOKEN_COOKIE_SECURE   — только HTTPS (true на проде)
 *   REFRESH_TOKEN_COOKIE_HTTP_ONLY — true (скрыт от JS)
 *   REFRESH_TOKEN_COOKIE_SAME_SITE — Strict / Lax / None
 *   REFRESH_TOKEN_COOKIE_DOMAIN   — домен (пусто для локальной разработки)
 */
readonly class RefreshTokenService
{
    public function __construct(
        private RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private RefreshTokenManagerInterface   $refreshTokenManager,
    ) {}

    /**
     * Создаёт и сохраняет refresh-токен в БД, возвращает его строковое значение.
     */
    public function createRefreshToken(UserInterface $user): string
    {
        // TTL берётся из ENV, а не из конфиг бандла — чтобы можно было
        // переопределить TTL без изменения yaml-конфига
        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, $_ENV['REFRESH_TOKEN_TTL']);
        $this->refreshTokenManager->save($refreshToken);

        return $refreshToken->getRefreshToken();
    }

    /**
     * Формирует HttpOnly-cookie с refresh-токеном.
     * Cookie добавляется в HTTP-ответ, а не в JSON-тело.
     */
    public function createRefreshTokenCookie(string $refreshTokenValue): Cookie
    {
        return Cookie::create('refresh_token')
            ->withValue($refreshTokenValue)
            ->withExpires(new DateTime("+{$_ENV['REFRESH_TOKEN_TTL']} seconds"))
            ->withPath($_ENV['REFRESH_TOKEN_COOKIE_PATH'])
            ->withSecure((bool)$_ENV['REFRESH_TOKEN_COOKIE_SECURE'])
            ->withHttpOnly((bool)$_ENV['REFRESH_TOKEN_COOKIE_HTTP_ONLY']) // JS не сможет его прочитать
            ->withSameSite($_ENV['REFRESH_TOKEN_COOKIE_SAME_SITE'])
            ->withDomain($_ENV['REFRESH_TOKEN_COOKIE_DOMAIN']);
    }
}
