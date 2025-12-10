<?php

namespace App\Controller\Api\OAuth\Google;

use App\Dto\OAuth\Google\GoogleCallbackInput;
use App\Dto\OAuth\Google\GoogleCallbackOutput;
use App\Service\OAuth\Google\GoogleOAuthService;
use Psr\Cache\InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

class GoogleOAuthCallbackController extends AbstractController
{
    public function __construct(private readonly GoogleOAuthService $googleOAuth) {}

    /**
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    public function __invoke(#[MapRequestPayload] GoogleCallbackInput $input): GoogleCallbackOutput
    {
        $result = $this->googleOAuth->handleCode(
            $input->getCode(), // Используем getter, который декодирует
            $input->state,
            $input->role
        );

        $output = new GoogleCallbackOutput();
        $output->user = $result['user'];
        $output->token = $result['token'];

        return $output;
    }
}
