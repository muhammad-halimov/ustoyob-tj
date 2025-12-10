<?php

namespace App\Entity\OAuth;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\ApiResource;
use App\Controller\Api\OAuth\Google\GoogleOAuthController;
use App\Dto\OAuth\Google\GoogleAuthUrlOutput;
use App\Dto\OAuth\Google\GoogleCallbackInput;
use App\Dto\OAuth\Google\GoogleCallbackOutput;

//#[ApiResource(
//    operations: [
//        new Post(
//            uriTemplate: '/auth/google/callback',
//            controller: GoogleOAuthController::class,
//            input: GoogleCallbackInput::class,
//            output: GoogleCallbackOutput::class,
//        ),
//        new Get(
//            uriTemplate: '/auth/google/url',
//            controller: GoogleOAuthController::class,
//            input: false,
//            output: GoogleAuthUrlOutput::class,
//        )
//    ]
//)]
class GoogleOAuthDocumentation {}
