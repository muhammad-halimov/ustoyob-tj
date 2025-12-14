<?php

namespace App\Controller\Api\OAuth\Meta\Facebook;

use App\Dto\OAuth\GeneralCallbackInput;
use App\Dto\OAuth\GeneralCallbackOutput;
use App\Service\Auth\RefreshTokenService;
use App\Service\OAuth\Meta\Facebook\FacebookOAuthService;
use Psr\Cache\InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

class FacebookOAuthCallbackController extends AbstractController
{
    public function __construct(
        private readonly FacebookOAuthService $facebookOAuth,
        private readonly RefreshTokenService  $refreshTokenService,
    ) {}

    /**
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    public function __invoke(#[MapRequestPayload] GeneralCallbackInput $input): JsonResponse
    {
        $result = $this->facebookOAuth->handleCode(
            $input->getCode(),
            $input->getState(),
            $input->role
        );

        $output = new GeneralCallbackOutput();
        $output->user = $result['user'];
        $output->token = $result['token'];

        // Создаем refresh token
        $refreshTokenValue = $this->refreshTokenService->createRefreshToken($result['user']);

        // Сериализуем DTO в JSON
        $response = $this->json($output);

        // Устанавливаем refresh token через HttpOnly cookie
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie($refreshTokenValue));

        return $response;
    }
}
