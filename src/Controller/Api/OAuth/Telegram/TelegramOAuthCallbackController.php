<?php

namespace App\Controller\Api\OAuth\Telegram;

use App\Dto\OAuth\GeneralCallbackOutput;
use App\Dto\OAuth\TelegramCallbackInput;
use App\Service\Auth\RefreshTokenService;
use App\Service\OAuth\Telegram\TelegramOAuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

class TelegramOAuthCallbackController extends AbstractController
{
    public function __construct(private readonly TelegramOAuthService $telegramOAuth, readonly RefreshTokenService $refreshTokenService) {}

    public function __invoke(#[MapRequestPayload] TelegramCallbackInput $input): JsonResponse
    {
        $result = $this->telegramOAuth->handleCallback(
            $input->id,
            $input->username,
            $input->firstName,
            $input->lastName,
            $input->photoUrl,
            $input->role
        );

        $refreshTokenValue = $this->refreshTokenService->createRefreshToken($result['user']);

        $output = new GeneralCallbackOutput();
        $output->user = $result['user'];
        $output->token = $result['token'];

        $response = $this->json($output);
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie($refreshTokenValue));

        return $response;
    }
}
