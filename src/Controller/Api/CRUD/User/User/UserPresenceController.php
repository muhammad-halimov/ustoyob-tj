<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\UserPresenceService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Управление онлайн-присутствием пользователя.
 *
 * Фронтенд вызывает эти эндпоинты явно, а не система по кроне:
 *
 * POST /api/users/ping    — heartbeat каждые 30 сек пока вкладка открыта
 * POST /api/users/offline — при закрытии вкладки (navigator.sendBeacon)
 *
 * Это точнее и легче, чем крон: статус меняется именно тогда,
 * когда пользователь реально открыл или закрыл сайт.
 */
#[Route('/api/users')]
class UserPresenceController extends AbstractController
{
    public function __construct(
        private readonly Security            $security,
        private readonly AccessService       $accessService,
        private readonly UserPresenceService $presenceService,
    ) {}

    /**
     * POST /api/users/ping
     *
     * Фронтенд вызывает каждые 30 секунд пока вкладка открыта.
     * Обновляет lastSeen и переводит в online если был offline.
     * Публикует Mercure-событие только при смене online→offline.
     */
    #[Route('/ping', name: 'api_users_ping', methods: ['POST'])]
    public function ping(): JsonResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();
        $this->accessService->check($user);

        $this->presenceService->markOnline($user);

        return $this->json(['ok' => true]);
    }

    /**
     * POST /api/users/offline
     *
     * Фронтенд вызывает при закрытии вкладки через navigator.sendBeacon.
     * Немедленно переводит пользователя в offline и публикует событие.
     */
    #[Route('/offline', name: 'api_users_offline', methods: ['POST'])]
    public function offline(): JsonResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();
        $this->accessService->check($user);

        $this->presenceService->markOffline($user);

        return $this->json(['ok' => true]);
    }
}
