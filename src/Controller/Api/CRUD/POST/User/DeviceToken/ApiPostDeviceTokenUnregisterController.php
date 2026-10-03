<?php

namespace App\Controller\Api\CRUD\POST\User\DeviceToken;

use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Repository\User\DeviceTokenRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * POST /api/device-tokens/unregister — { token }
 *
 * Выход из аккаунта в приложении: устройство больше не получает уведомления
 * этого пользователя. Без авторизации — приложение зовёт его уже после того,
 * как сбросило JWT; знать надо сам токен устройства (его знает только это
 * устройство), а удалить чужую подписку им нельзя никак иначе, чем
 * отписав само это устройство. Неизвестный токен — тоже 204.
 */
class ApiPostDeviceTokenUnregisterController extends AbstractApiHelperController
{
    public function __construct(private readonly DeviceTokenRepository $deviceTokenRepository) {}

    public function __invoke(): JsonResponse
    {
        $content = $this->getContent();
        $token   = is_array($content) ? trim((string) ($content['token'] ?? '')) : '';

        $device = $token !== '' ? $this->deviceTokenRepository->findOneBy(['token' => $token]) : null;

        if ($device) {
            $this->entityManager->remove($device);
            $this->flush();
        }

        return $this->json(null, 204);
    }
}
