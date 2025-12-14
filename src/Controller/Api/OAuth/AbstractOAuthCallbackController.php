<?php

namespace App\Controller\Api\OAuth;

use App\Dto\OAuth\GeneralCallbackInput;
use App\Dto\OAuth\GeneralCallbackOutput;
use App\Service\Auth\RefreshTokenService;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

abstract class AbstractOAuthCallbackController extends AbstractController
{
    public function __construct(protected readonly OAuthServiceInterface $oauthService, protected readonly RefreshTokenService $refreshTokenService) {}

    public function __invoke(#[MapRequestPayload] GeneralCallbackInput $input): JsonResponse
    {
        $result = $this->oauthService->handleCode(
            $input->getCode(),
            $input->getState(),
            $input->role
        );

        $output = new GeneralCallbackOutput();
        $output->user = $result['user'];
        $output->token = $result['token'];

        $refreshTokenValue = $this->refreshTokenService->createRefreshToken($result['user']);
        $response = $this->json($output);
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie($refreshTokenValue));

        return $response;
    }
}
