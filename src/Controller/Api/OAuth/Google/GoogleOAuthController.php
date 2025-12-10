<?php

namespace App\Controller\Api\OAuth\Google;

use App\Service\OAuth\Google\GoogleOAuthService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

#[AsController]
#[Route('/api/auth/google')]
class GoogleOAuthController extends AbstractController
{
    public function __construct(private readonly GoogleOAuthService $googleOAuth) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    #[Route('/url', methods: ['GET'])]
    public function url(): RedirectResponse
    {
        return new RedirectResponse($this->googleOAuth->generateGoogleOAuthRedirectUri());
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ClientExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws ServerExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws TransportExceptionInterface
     */
    #[Route('/callback', methods: ['POST'])]
    public function callback(Request $request): JsonResponse
    {
        $code = $request->get('code');
        $state = $request->query->get('state');
        $role = $request->query->get('role') ?? null;

        try {
            $result = $this->googleOAuth->handleCode($code, $state, $role);

            return $this->json($result, context: ['groups' => ['clients:read', 'masters:read', 'users:me:read']]);
        } catch (BadRequestHttpException $e) {
            // Здесь ловим только реальные BadRequestHttpException
            return $this->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }
}
