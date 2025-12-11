<?php

namespace App\Service\Auth;

use DateTime;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\Security\Core\User\UserInterface;

readonly class RefreshTokenService
{
    public function __construct(
        private RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private RefreshTokenManagerInterface   $refreshTokenManager,
    ) {}

    public function createRefreshToken(UserInterface $user): string
    {
        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, $_ENV['REFRESH_TOKEN_TTL']);
        $this->refreshTokenManager->save($refreshToken);

        return $refreshToken->getRefreshToken();
    }

    public function createRefreshTokenCookie(string $refreshTokenValue): Cookie
    {
        return Cookie::create('refresh_token')
            ->withValue($refreshTokenValue)
            ->withExpires(new DateTime("+{$_ENV['REFRESH_TOKEN_TTL']} seconds"))
            ->withPath($_ENV['REFRESH_TOKEN_COOKIE_PATH'])
            ->withSecure((bool)$_ENV['REFRESH_TOKEN_COOKIE_SECURE'])
            ->withHttpOnly((bool)$_ENV['REFRESH_TOKEN_COOKIE_HTTP_ONLY'])
            ->withSameSite($_ENV['REFRESH_TOKEN_COOKIE_SAME_SITE'])
            ->withDomain($_ENV['REFRESH_TOKEN_COOKIE_DOMAIN']);
    }
}
