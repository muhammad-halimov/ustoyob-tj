<?php

namespace App\Controller\Api\OAuth\Meta\Facebook;

use App\Dto\OAuth\GeneralAuthUrlOutput;
use App\Service\OAuth\Meta\Facebook\FacebookOAuthService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class FacebbokOAuthUrlController extends AbstractController
{
    public function __construct(private readonly FacebookOAuthService $facebookOAuth) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function __invoke(GeneralAuthUrlOutput $output): JsonResponse
    {
        $output->url = ($this->facebookOAuth->generateFacebookOAuthRedirectUri());

        return $this->json($output);
    }
}
