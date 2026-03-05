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

/**
 * GET /api/users/presence/subscribe
 *
 * Открывает SSE-поток для отслеживания онлайн-статуса пользователя.
 * Пока поток открыт — пользователь считается онлайн.
 * Когда поток закрывается — пользователь офлайн.
 *
 * Это единственный способ бэкенду знать, что браузер всё ещё открыт.
 * Не нужно никаких heartbeat-пингов или полинга — это не масштабируется.
 *
 * КАК РАБОТАЕТ:
 * 1. Фронтенд вызывает GET /api/users/presence/subscribe
 * 2. Получает SSE-поток, который держит соединение открытым
 * 3. Бэкенд отправляет "ping" каждые 15 сек (чтобы браузер не закрыл соединение)
 * 4. Если фронтенд закрывает поток или теряет сеть — соединение закрывается
 * 5. Listener на kernel.response замечает закрытие и вызывает markOffline
 */
#[Route('/api/users')]
class UserPresenceSubscribeController extends AbstractController
{
    public function __construct(
        private readonly Security            $security,
        private readonly AccessService       $accessService,
        private readonly UserPresenceService $presenceService,
    ) {}

    #[Route('/presence/subscribe', name: 'api_users_presence_subscribe', methods: ['GET'])]
    public function subscribe(): StreamedResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();
        $this->accessService->check($user);

        // Переводим в онлайн
        $this->presenceService->markOnline($user);

        // SSE-поток: простые пинги для поддержания соединения
        $response = new StreamedResponse(function () {
            // Отправляем пинг каждые 15 сек, чтобы браузер не разорвал соединение
            for ($i = 0; $i < 240; $i++) { // 240 * 15 сек = 60 минут макс
                echo ": ping\n\n";
                flush();
                sleep(15);
            }
        });

        // Перехватываем закрытие соединения
        $response->setCallback(function () use ($user) {
            // Это вызовется когда фронтенд закроет соединение или оно упадёт
            $this->presenceService->markOffline($user);
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Nginx
        $response->setCharset('utf-8');

        return $response;
    }
}
