<?php

namespace App\Controller\Api\OAuth\Meta\Instagram;

use App\Controller\Api\OAuth\AbstractOAuthUrlController;
use App\Service\OAuth\Meta\Instagram\InstagramOAuthService;

class InstagramOAuthUrlController extends AbstractOAuthUrlController
{
    public function __construct(InstagramOAuthService $oauthService)
    {
        parent::__construct($oauthService);
    }
}
