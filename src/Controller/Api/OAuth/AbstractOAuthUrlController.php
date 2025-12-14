<?php

namespace App\Controller\Api\OAuth;

use App\Dto\OAuth\GeneralAuthUrlOutput;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

abstract class AbstractOAuthUrlController extends AbstractController
{
    public function __construct(protected readonly OAuthServiceInterface $oauthService) {}

    public function __invoke(GeneralAuthUrlOutput $output): JsonResponse
    {
        $output->url = $this->oauthService->generateOAuthRedirectUri();
        return $this->json($output);
    }
}
