<?php

namespace App\Service\Auth;

use DateMalformedStringException;
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
        private string                         $environment,
        private int                            $ttl = 1296000
    ) {}

    public function createRefreshToken(UserInterface $user): string
    {
        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, $this->ttl);
        $this->refreshTokenManager->save($refreshToken);

        return $refreshToken->getRefreshToken();
    }

    /**
     * @throws DateMalformedStringException
     */
    public function createRefreshTokenCookie(string $refreshTokenValue): Cookie
    {
        $isProd = $this->environment === 'prod';

        return Cookie::create('refresh_token')
            ->withValue($refreshTokenValue)
            ->withExpires(new DateTime('+' . $this->ttl . ' seconds'))
            ->withPath('/')
            ->withSecure($isProd)
            ->withHttpOnly()
            ->withSameSite($isProd ? Cookie::SAMESITE_STRICT : Cookie::SAMESITE_LAX);
    }
}
