<?php

namespace App\Service\Auth;

use App\ApiResource\AppMessages;
use App\Exception\AppMessageException;
use App\Service\Extra\PhoneNumberUtil;
use App\Service\Notification\Sms\SmsException;
use App\Service\Notification\Sms\SmsSenderInterface;
use Psr\Cache\InvalidArgumentException;
use Psr\Log\LoggerInterface;
use Random\RandomException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * 6-значные коды по SMS: вход по коду (им же подтверждается аккаунт,
 * зарегистрированный по телефону), восстановление пароля, привязка номера.
 * Код генерирует и проверяет сам бэкенд (OtpService), провайдер SMS только
 * доставляет текст (SmsSenderInterface — сейчас Twilio).
 *
 * У каждой цели свой код: код восстановления пароля не подходит для входа и
 * наоборот.
 *
 * SMS стоят денег, и их можно гнать на чужие/платные номера («SMS pumping»),
 * поэтому кроме лимита по IP (ApiRateLimitSubscriber) — лимиты на сам номер:
 * не чаще раза в минуту и не больше 10 в сутки (config/packages/rate_limiter.yaml),
 * и, если задан SMS_ALLOWED_COUNTRY_CODES, только номера этих стран.
 */
class PhoneCodeService
{
    public const string LOGIN = 'login';
    public const string RESET = 'reset';
    public const string LINK  = 'link';

    private const array TEXTS = [
        'ru'  => 'Код %s: %s. Никому не сообщайте.',
        'tj'  => 'Рамзи %s: %s. Ба касе нагӯед.',
        'eng' => '%s code: %s. Do not share it.',
    ];

    public function __construct(
        private readonly OtpService         $otp,
        private readonly SmsSenderInterface $sms,
        private readonly LoggerInterface    $logger,
        #[Target('sms_phone_cooldown.limiter')]
        private readonly RateLimiterFactory $cooldownLimiter,
        #[Target('sms_phone_daily.limiter')]
        private readonly RateLimiterFactory $dailyLimiter,
        #[Autowire('%env(default::SMS_ALLOWED_COUNTRY_CODES)%')]
        private readonly ?string            $allowedCountries = null,
        #[Autowire('%env(default::FRONTEND_URL)%')]
        private readonly ?string            $frontendUrl = null,
    ) {}

    /**
     * @param string $phone E.164 (PhoneNumberUtil::normalize)
     * @throws AppMessageException Номер не из разрешённых стран, лимит, SMS не ушло.
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function send(string $phone, string $purpose): void
    {
        $this->throttle($phone);

        $key  = $this->key($phone, $purpose);
        $code = $this->otp->issue($key);

        try {
            $this->sms->send($phone, $this->text($code));
        } catch (SmsException $e) {
            $this->logger->error('Не удалось отправить SMS с кодом', [
                'to'        => PhoneNumberUtil::mask($phone),
                'purpose'   => $purpose,
                'exception' => $e->getMessage(),
            ]);
            throw new AppMessageException(AppMessages::SMS_SEND_FAILED);
        }
    }

    /**
     * Те же проверки и лимиты, что у send(), но без SMS. Для номеров, на которые
     * код не отправляется, потому что аккаунта с ними нет (вход по коду,
     * восстановление пароля): ответ должен быть тем же, что и для
     * существующего номера, — иначе по «код уже отправлен, подождите минуту»
     * было бы видно, какие номера зарегистрированы.
     *
     * @throws AppMessageException
     */
    public function throttle(string $phone): void
    {
        if (!PhoneNumberUtil::inCountries($phone, $this->allowedCountries ?? ''))
            throw new AppMessageException(AppMessages::PHONE_COUNTRY_NOT_SUPPORTED);

        if (!$this->cooldownLimiter->create($phone)->consume()->isAccepted())
            throw new AppMessageException(AppMessages::SMS_RESEND_TOO_SOON);

        if (!$this->dailyLimiter->create($phone)->consume()->isAccepted())
            throw new AppMessageException(AppMessages::SMS_LIMIT_REACHED);
    }

    /** @throws InvalidArgumentException */
    public function verify(string $phone, string $purpose, string $code): bool
    {
        return $this->otp->verify($this->key($phone, $purpose), $code);
    }

    private function key(string $phone, string $purpose): string
    {
        return "phone_otp_{$purpose}_" . ltrim($phone, '+');
    }

    /**
     * Короткий текст: кириллица в SMS — UCS-2, 70 символов на сообщение,
     * длиннее — уже два платных сегмента. Последняя строка «@домен #код» —
     * формат WebOTP: Chrome на Android сам подставляет код в поле на сайте.
     */
    private function text(string $code): string
    {
        $host = parse_url((string) $this->frontendUrl, PHP_URL_HOST) ?: 'ustoyob.tj';
        $text = sprintf(self::TEXTS[AppMessages::getLocale()] ?? self::TEXTS['tj'], $host, $code);

        return "{$text}\n\n@{$host} #{$code}";
    }
}
