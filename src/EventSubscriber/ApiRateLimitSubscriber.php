<?php

namespace App\EventSubscriber;

use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * Применяет rate limiting к чувствительным API-эндпоинтам.
 *
 * Защищаемые пути:
 *   /api/authentication_token   — 5 попыток/мин  (брутфорс пароля)
 *   /change-password/send-otp/  — 3 запроса/5мин (спам письмами)
 *   /change-password/           — 3 запроса/5мин (брутфорс OTP)
 *   /confirm-account/           — 10 попыток/час (перебор токена)
 *   /confirm-account-tokenless/ — 10 попыток/час (повторные отправки)
 *
 * Ключ лимита: IP-адрес клиента.
 * При превышении возвращает HTTP 429 Too Many Requests.
 */
class ApiRateLimitSubscriber implements EventSubscriberInterface
{
    public function __construct(
        #[Target('api_login.limiter')]
        private readonly RateLimiterFactory $loginLimiter,
        #[Target('api_otp_send.limiter')]
        private readonly RateLimiterFactory $otpSendLimiter,
        #[Target('api_confirm_account.limiter')]
        private readonly RateLimiterFactory $confirmAccountLimiter,
    ) {}

    public static function getSubscribedEvents(): array
    {
        // priority 10 — до основной обработки запроса
        return [KernelEvents::REQUEST => ['onRequest', 10]];
    }

    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) return;

        $request = $event->getRequest();
        $path    = $request->getPathInfo();
        $ip      = $request->getClientIp() ?? 'unknown';

        $limiter = match ($path) {
            '/api/authentication_token'                      => $this->loginLimiter->create($ip),
            '/change-password/send-otp/', '/change-password/' => $this->otpSendLimiter->create($ip),
            '/confirm-account/', '/confirm-account-tokenless/' => $this->confirmAccountLimiter->create($ip),
            default => null,
        };

        if ($limiter !== null && !$limiter->consume(1)->isAccepted()) {
            throw new TooManyRequestsHttpException(60, 'Too many requests. Please try again later.');
        }
    }
}
