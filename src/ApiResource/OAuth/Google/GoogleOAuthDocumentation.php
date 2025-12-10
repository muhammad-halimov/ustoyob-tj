<?php

namespace App\ApiResource\OAuth\Google;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\OAuth\Google\GoogleOAuthCallbackController;
use App\Controller\Api\OAuth\Google\GoogleOAuthUrlController;
use App\Dto\OAuth\Google\GoogleAuthUrlOutput;
use App\Dto\OAuth\Google\GoogleCallbackInput;
use App\Dto\OAuth\Google\GoogleCallbackOutput;

#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/auth/google/callback',
            controller: GoogleOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'google:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['google:write']],
            input: GoogleCallbackInput::class,
            output: GoogleCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/google/url',
            controller: GoogleOAuthUrlController::class,
            normalizationContext: ['groups' => ['google:read']],
            input: false,
            output: GoogleAuthUrlOutput::class,
            read: false,
        )
    ]
)]
class GoogleOAuthDocumentation {}
