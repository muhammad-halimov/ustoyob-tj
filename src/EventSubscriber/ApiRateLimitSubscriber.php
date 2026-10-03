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
 *   /api/authentication_token        — 5 попыток/мин  (брутфорс пароля)
 *   /api/change-password/send-otp/   — 3 запроса/5мин (спам письмами/SMS)
 *   /api/confirm-account/            — 10 попыток/час (перебор токена)
 *   /api/confirm-account-tokenless/  — 10 попыток/час (повторные отправки)
 *   /api/phone/send-code             — 10 SMS/час     (SMS платные)
 *   POST /api/users с телефоном      — 10 SMS/час     (регистрация по телефону шлёт SMS)
 *   /api/change-password/, /api/phone/login, /api/users/me/phone
 *                                    — 20 попыток/10мин (перебор 6-значного кода; ещё
 *                                      и сам код сгорает после 5 неверных — OtpService)
 *
 * БАГФИКС: пути раньше были без префикса /api (/change-password/…,
 * /confirm-account/…), а API Platform отдаёт эти операции под /api
 * (config/routes/api_platform.yaml) — getPathInfo() их никогда не совпадал,
 * и лимиты на OTP/подтверждение не действовали вовсе.
 *
 * Ключ лимита: IP-адрес клиента. Лимиты на сам номер телефона (не чаще раза в
 * минуту, 10 в сутки) — в PhoneCodeService, они от IP не зависят.
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
        #[Target('api_guest_ticket.limiter')]
        private readonly RateLimiterFactory $guestTicketLimiter,
        #[Target('api_sms_send.limiter')]
        private readonly RateLimiterFactory $smsSendLimiter,
        #[Target('api_code_verify.limiter')]
        private readonly RateLimiterFactory $codeVerifyLimiter,
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
            '/api/authentication_token'                              => $this->loginLimiter->create($ip),
            '/api/change-password/send-otp/'                         => $this->otpSendLimiter->create($ip),
            '/api/confirm-account/', '/api/confirm-account-tokenless/' => $this->confirmAccountLimiter->create($ip),
            '/api/phone/send-code'                                   => $this->smsSendLimiter->create($ip),
            '/api/change-password/', '/api/phone/login', '/api/users/me/phone' => $this->codeVerifyLimiter->create($ip),
            default => null,
        };

        // Для создания тикета проверяем и метод (POST), чтобы не задеть GET /api/tech-supports (admin).
        if ($limiter === null && $path === '/api/tech-supports' && $request->isMethod('POST')) {
            $limiter = $this->guestTicketLimiter->create($ip);
        }

        // Регистрация по телефону сразу шлёт SMS с кодом — тот же лимит, что у /api/phone/send-code
        if ($limiter === null && $path === '/api/users' && $request->isMethod('POST')) {
            $body = json_decode($request->getContent(), true);
            if (is_array($body) && !empty($body['phone'])) $limiter = $this->smsSendLimiter->create($ip);
        }

        if ($limiter !== null && !$limiter->consume(1)->isAccepted()) {
            throw new TooManyRequestsHttpException(60, 'Too many requests. Please try again later.');
        }
    }
}
