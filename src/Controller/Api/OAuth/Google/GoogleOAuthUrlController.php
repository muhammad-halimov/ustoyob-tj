<?php

namespace App\Controller\Api\OAuth\Google;

use App\Dto\OAuth\Google\GoogleAuthUrlOutput;
use App\Service\OAuth\Google\GoogleOAuthService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class GoogleOAuthUrlController extends AbstractController
{
    public function __construct(private readonly GoogleOAuthService $googleOAuth) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function __invoke(GoogleAuthUrlOutput $output): GoogleAuthUrlOutput
    {
        $output->url = $this->googleOAuth->generateGoogleOAuthRedirectUri();

        return $output;
    }
}
