<?php

namespace App\Controller\Api\CRUD\POST\User\DeviceToken;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Extra\Translation;
use App\Entity\User\DeviceToken;
use App\Repository\User\DeviceTokenRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * POST /api/device-tokens — { token, platform: android|ios, locale?: tj|ru|eng }
 *
 * Мобильное приложение регистрирует устройство для push-уведомлений (при
 * запуске и после входа). Upsert по токену: то же устройство под другим
 * аккаунтом перепривязывается к текущему пользователю (из Bearer-токена).
 */
class ApiPostDeviceTokenController extends AbstractApiHelperController
{
    public function __construct(private readonly DeviceTokenRepository $deviceTokenRepository) {}

    public function __invoke(): JsonResponse
    {
        $bearer = $this->checkedUser();

        $content  = $this->getContent();
        $token    = is_array($content) ? trim((string) ($content['token'] ?? '')) : '';
        $platform = is_array($content) ? (string) ($content['platform'] ?? '') : '';
        $locale   = is_array($content) ? (string) ($content['locale'] ?? '') : '';

        if ($token === '' || mb_strlen($token) > 512 || !in_array($platform, DeviceToken::PLATFORMS, true))
            return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $device = $this->deviceTokenRepository->findOneBy(['token' => $token]) ?? (new DeviceToken())->setToken($token);

        $device
            ->setUser($bearer)
            ->setPlatform($platform)
            ->setLocale(in_array($locale, Translation::LOCALES, true) ? $locale : null)
            ->touch();

        $this->persist($device);
        $this->flush();

        return $this->json(null, 204);
    }
}
