<?php

namespace App\ApiResource\OAuth;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\OAuth\Profile\GetOAuthProvidersController;
use App\Controller\Api\OAuth\Profile\LinkOAuthProviderController;
use App\Controller\Api\OAuth\Profile\UnlinkOAuthProviderController;

#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/profile/oauth/link',
            controller: LinkOAuthProviderController::class,
            input: false,
            output: false,
            read: false,
            write: false,
        ),
        new Delete(
            uriTemplate: '/profile/oauth/unlink/{provider}',
            controller: UnlinkOAuthProviderController::class,
            input: false,
            output: false,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/profile/oauth/providers',
            controller: GetOAuthProvidersController::class,
            input: false,
            output: false,
            read: false,
            write: false,
        ),
    ]
)]
class ProfileOAuth {}
