<?php

namespace App\ApiResource\ApiAuth;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Auth\ApiLoginController;
use App\Controller\Api\Auth\ApiLogoutController;
use App\Dto\ApiAuth\ApiLogin\LoginInput;
use App\Dto\ApiAuth\ApiLogin\LoginOutput;
use App\Dto\ApiAuth\ApiLogout\LogoutOutput;

#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/authentication_token',
            controller: ApiLoginController::class,
            normalizationContext: ['groups' => ['auth:read']],
            denormalizationContext: ['groups' => ['auth:write']],
            input: LoginInput::class,
            output: LoginOutput::class,
            read: false,
            write: false,
        ),
        new Post(
            uriTemplate: '/logout',
            controller: ApiLogoutController::class,
            normalizationContext: ['groups' => ['auth:read']],
            denormalizationContext: ['groups' => ['auth:write']],
            input: false,
            output: LogoutOutput::class,
            read: false,
            write: false,
            name: 'api_logout',
        )
    ]
)]
class ApiAuthenticationDocumentation {}
