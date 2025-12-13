<?php

namespace App\ApiResource\OAuth;

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
        // Google
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
            input: false,
            output: GoogleAuthUrlOutput::class,
            read: false,
            write: false
        ),

        // Meta - Facebook
        new Post(
            uriTemplate: '/auth/facebook/callback',
            controller: GoogleOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'google:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['facebook:write']],
            input: GoogleCallbackInput::class,
            output: GoogleCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/facebook/url',
            controller: GoogleOAuthUrlController::class,
            input: false,
            output: GoogleAuthUrlOutput::class,
            read: false,
            write: false
        ),

        // Meta - Instagram
        new Post(
            uriTemplate: '/auth/instagram/callback',
            controller: GoogleOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'google:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['instagram:write']],
            input: GoogleCallbackInput::class,
            output: GoogleCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/instagram/url',
            controller: GoogleOAuthUrlController::class,
            input: false,
            output: GoogleAuthUrlOutput::class,
            read: false,
            write: false
        ),
    ]
)]
class GeneralOAuth {}
