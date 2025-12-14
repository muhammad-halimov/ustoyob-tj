<?php

namespace App\Controller\Api\OAuth\Meta\Instagram;

use App\Controller\Api\OAuth\AbstractOAuthCallbackController;
use App\Service\Auth\RefreshTokenService;
use App\Service\OAuth\Meta\Instagram\InstagramOAuthService;

class InstagramOAuthCallbackController extends AbstractOAuthCallbackController
{
    public function __construct(InstagramOAuthService $oauthService, RefreshTokenService $refreshTokenService)
    {
        parent::__construct($oauthService, $refreshTokenService);
    }
}
