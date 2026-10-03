<?php

namespace App\Service\Auth;

use App\Entity\User;
use App\Service\Notification\Abstract\AbstractMailerService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * OTP-based password change flow:
 *   1. sendOtp()   — генерирует 6-значный код, сохраняет в Redis (TTL 10 мин), отправляет на email
 *   2. verifyOtp() — проверяет код, удаляет из Redis (one-time use)
 *
 * Хранение и проверка кода — OtpService (там же предел неверных попыток).
 * Тот же поток по SMS — PhoneCodeService::RESET.
 */
class AccountChangePasswordService extends AbstractMailerService
{
    private const string PREFIX = 'password_otp_';

    public function __construct(private readonly OtpService $otp) {}

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     */
    public function sendOtp(User $user): void
    {
        $code = $this->otp->issue(self::PREFIX . $user->getId());

        $siteName = $this->siteName();

        $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Смена пароля | {$siteName}",
            text:    "Ваш код подтверждения для смены пароля: {$code}\n\nКод действителен 10 минут.\nЕсли вы не запрашивали смену пароля — проигнорируйте это письмо.",
            html:    $this->htmlEmail(
                title:  'Смена пароля',
                body:   "<p>Ваш код подтверждения для смены пароля на <strong>{$siteName}</strong>:</p>"
                        . "<div style=\"text-align:center;margin:30px 0\">"
                        . "<span style=\"font-size:42px;font-weight:700;letter-spacing:10px;color:#667eea;font-family:'Courier New',monospace\">{$code}</span>"
                        . "</div>"
                        . "<p style=\"color:#666;font-size:14px\">Код действителен 10 минут.</p>",
                footer: "Если вы не запрашивали смену пароля на {$siteName} — проигнорируйте письмо.",
            ),
            refId:   self::PREFIX . $user->getId(),
        );
    }

    /**
     * Проверяет OTP и удаляет его из кеша (one-time use).
     *
     * @throws InvalidArgumentException
     */
    public function verifyOtp(User $user, string $code): bool
    {
        return $this->otp->verify(self::PREFIX . $user->getId(), $code);
    }
}
