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

        $presenceService = $this->presenceService;
        $userId = $user->getId();

        // SSE-поток: пинги + маркировка офлайн при закрытии соединения.
        // ВАЖНО: setCallback() ЗАМЕНЯЕТ коллбэк, не добавляет teardown.
        // Всё должно быть в одном closure.
        $response = new StreamedResponse(function () use ($presenceService, $userId) {
            // Позволяем PHP заметить обрыв клиентского соединения
            ignore_user_abort(false);

            for ($i = 0; $i < 240; $i++) { // 240 * 15 сек = 60 минут макс
                echo ": ping\n\n";
                ob_flush();
                flush();

                if (connection_aborted()) {
                    break;
                }

                sleep(15);

                if (connection_aborted()) {
                    break;
                }
            }

            // Вызывается и при таймауте (60 мин), и при обрыве соединения
            $presenceService->markOfflineById($userId);
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Nginx
        $response->setCharset('utf-8');

        return $response;
    }
}
