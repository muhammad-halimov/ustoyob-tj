<?php

namespace App\Controller\Api\OAuth\Meta\Instagram;

use App\Dto\OAuth\GeneralAuthUrlOutput;
use App\Service\OAuth\Meta\Instagram\InstagramOAuthService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class InstagramOAuthUrlController extends AbstractController
{
    public function __construct(private readonly InstagramOAuthService $instagramOAuth) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function __invoke(GeneralAuthUrlOutput $output): JsonResponse
    {
        $output->url = ($this->instagramOAuth->generateInstagramOAuthRedirectUri());

        return $this->json($output);
    }
}
