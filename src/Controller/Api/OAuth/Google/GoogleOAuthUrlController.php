<?php

namespace App\Controller\Api\OAuth\Google;

use App\Controller\Api\OAuth\AbstractOAuthUrlController;
use App\Service\OAuth\Google\GoogleOAuthService;

class GoogleOAuthUrlController extends AbstractOAuthUrlController
{
    public function __construct(GoogleOAuthService $oauthService)
    {
        parent::__construct($oauthService);
    }
}
