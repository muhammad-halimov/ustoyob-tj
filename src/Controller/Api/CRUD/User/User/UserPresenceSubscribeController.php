<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\UserPresenceService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users')]
class UserPresenceSubscribeController extends AbstractController
{
    public function __construct(
        private readonly Security            $security,
        private readonly AccessService       $accessService,
        private readonly UserPresenceService $presenceService,
    ) {}

    /**
     * GET /api/users/presence/subscribe
     *
     * SSE-поток присутствия: пока соединение открыто — пользователь онлайн.
     * JWT передаётся query-param ?authorization=TOKEN (EventSource не поддерживает заголовки).
     *
     * PHP-паттерн для PHP-FPM:
     *   - ignore_user_abort(true)  → скрипт продолжает работать когда клиент отключился
     *   - connection_status() !== CONNECTION_NORMAL после flush() → обнаруживает обрыв
     */
    #[Route('/presence/subscribe', name: 'api_users_presence_subscribe', methods: ['GET'])]
    public function subscribe(): StreamedResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();
        $this->accessService->check($user);

        $this->presenceService->markOnline($user);

        $presenceService = $this->presenceService;
        $userId          = $user->getId();

        $response = new StreamedResponse(function () use ($presenceService, $userId) {
            set_time_limit(0);
            ignore_user_abort(true); // продолжать работу после отключения клиента

            while (true) {
                echo ": ping\n\n";
                if (ob_get_level()) ob_flush();
                flush();

                // После flush() PHP знает, что соединение оборвано
                if (connection_status() !== CONNECTION_NORMAL) {
                    break;
                }

                sleep(30);

                if (connection_status() !== CONNECTION_NORMAL) {
                    break;
                }
            }

            $presenceService->markOfflineById($userId);
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->setCharset('utf-8');

        return $response;
    }

    /**
     * POST /api/users/offline
     *
     * Явный офлайн от клиента — вызывается через navigator.sendBeacon() на beforeunload.
     * sendBeacon не умеет слать Authorization-заголовок, поэтому JWT — в query-param.
     * Не ждём ответа: HTTP 204.
     */
    #[Route('/offline', name: 'api_users_offline', methods: ['POST'])]
    public function offline(): Response
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        if ($user instanceof User) {
            $this->presenceService->markOffline($user);
        }

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
