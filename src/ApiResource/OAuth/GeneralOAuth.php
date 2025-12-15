<?php

namespace App\ApiResource\OAuth;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\OAuth\Google\GoogleOAuthCallbackController;
use App\Controller\Api\OAuth\Google\GoogleOAuthUrlController;
use App\Controller\Api\OAuth\Meta\Facebook\FacebokOAuthUrlController;
use App\Controller\Api\OAuth\Meta\Facebook\FacebookOAuthCallbackController;
use App\Controller\Api\OAuth\Meta\Instagram\InstagramOAuthCallbackController;
use App\Controller\Api\OAuth\Meta\Instagram\InstagramOAuthUrlController;
use App\Controller\Api\OAuth\Telegram\TelegramOAuthCallbackController;
use App\Dto\OAuth\GeneralAuthUrlOutput;
use App\Dto\OAuth\GeneralCallbackInput;
use App\Dto\OAuth\GeneralCallbackOutput;
use App\Dto\OAuth\TelegramCallbackInput;

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
            input: GeneralCallbackInput::class,
            output: GeneralCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/google/url',
            controller: GoogleOAuthUrlController::class,
            input: false,
            output: GeneralAuthUrlOutput::class,
            read: false,
            write: false
        ),

        // Meta - Instagram
        new Post(
            uriTemplate: '/auth/instagram/callback',
            controller: InstagramOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'instagram:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['instagram:write']],
            input: GeneralCallbackInput::class,
            output: GeneralCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/instagram/url',
            controller: InstagramOAuthUrlController::class,
            input: false,
            output: GeneralAuthUrlOutput::class,
            read: false,
            write: false
        ),

        // Meta - Facebook
        new Post(
            uriTemplate: '/auth/facebook/callback',
            controller: FacebookOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'facebook:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['facebook:write']],
            input: GeneralCallbackInput::class,
            output: GeneralCallbackOutput::class,
            read: false,
            write: false,
        ),
        new Get(
            uriTemplate: '/auth/facebook/url',
            controller: FacebokOAuthUrlController::class,
            input: false,
            output: GeneralAuthUrlOutput::class,
            read: false,
            write: false
        ),

        // Telgeram
        new Post(
            uriTemplate: '/auth/telegram/callback',
            controller: TelegramOAuthCallbackController::class,
            normalizationContext: ['groups' => [
                'telegram:read',
                'masters:read',
                'clients:read',
                'users:me:read'
            ],
                'skip_null_values' => false
            ],
            denormalizationContext: ['groups' => ['telegram:write']],
            input: TelegramCallbackInput::class,
            output: GeneralCallbackOutput::class,
            read: false,
            write: false,
        ),
    ]
)]
class GeneralOAuth {}
