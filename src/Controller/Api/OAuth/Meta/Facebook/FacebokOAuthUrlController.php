<?php

namespace App\Controller\Api\OAuth\Meta\Facebook;

use App\Controller\Api\OAuth\AbstractOAuthUrlController;
use App\Service\OAuth\Meta\Facebook\FacebookOAuthService;

class FacebokOAuthUrlController extends AbstractOAuthUrlController
{
    public function __construct(FacebookOAuthService $oauthService)
    {
        parent::__construct($oauthService);
    }
}
