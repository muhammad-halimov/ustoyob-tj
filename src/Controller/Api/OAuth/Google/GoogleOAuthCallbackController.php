<?php

namespace App\Controller\Api\OAuth\Google;

use App\Controller\Api\OAuth\AbstractOAuthCallbackController;
use App\Service\Auth\RefreshTokenService;
use App\Service\OAuth\Google\GoogleOAuthService;

class GoogleOAuthCallbackController extends AbstractOAuthCallbackController
{
    public function __construct(GoogleOAuthService $oauthService, RefreshTokenService $refreshTokenService)
    {
        parent::__construct($oauthService, $refreshTokenService);
    }
}
