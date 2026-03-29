<?php

namespace App\Service\Auth;

use App\Entity\User;
use App\Entity\User\AccountConfirmationToken;
use App\Service\Extra\AbstractMailerService;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Random\RandomException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
/**
 * Отправка письма для подтверждения аккаунта.
 *
 * Почему Transport::fromDsn вместо инжекции MailerInterface?
 *   MailerInterface Symfony по умолчанию отправляет письма асинхронно через Messenger.
 *   Transport::fromDsn отправляет СИНХРОННО в одном месте — мы сразу
 *   знаем результат: письмо ушло или вылетело исключение.
 *
 * Поток работы:
 *   1. Удалить все старые токены пользователя
 *   2. Создать новый токен (64 hex-символа, TTL 24ч)
 *   3. Сформировать URL на фронтенд-страницу /confirm-account/{token}
 *   4. Отправить письмо с plain-text и HTML-версией
 *
 * ENV-переменные:
 *   MAILER_DSN    — DSN почтового транспорта
 *   MAILER_SENDER — адрес отправителя
 *   FRONTEND_URL  — базовый URL фронтенда
 */
class AccountConfirmationService extends AbstractMailerService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * @param User $user
     * @return string
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function sendConfirmationEmail(User $user): string
    {
        // Удаляем старые токены для этого пользователя
        $oldTokens = $this->entityManager->getRepository(AccountConfirmationToken::class)->findBy(['user' => $user]);

        foreach ($oldTokens as $token) $this->entityManager->remove($token);

        // Создаем новый токен
        $token = new AccountConfirmationToken();
        $token->setUser($user);
        $token->setToken(bin2hex(random_bytes(32)));
        $token->setExpiresAt(new DateTime('+24 hours'));

        $this->entityManager->persist($token);
        $this->entityManager->flush();

        $url      = rtrim($_ENV['FRONTEND_URL'], '/') . '/confirm-account/' . $token->getToken();
        $siteName = $this->siteName();

        return $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Активация аккаунта | {$siteName}",
            text:    "Здравствуйте!\n\nДля активации аккаунта на {$siteName}:\n\n{$url}\n\nСсылка действительна 24 часа.\nЕсли не регистрировались — проигнорируйте.",
            html:    $this->htmlEmail(
                'Активация аккаунта',
                "<p>Для активации аккаунта на <strong>{$siteName}</strong>:</p>"
                . $this->htmlButton($url, 'Активировать аккаунт')
                . '<p style="color:#666;font-size:14px">Ссылка действительна 24 часа.</p>',
                "Если вы не регистрировались на {$siteName} — проигнорируйте письмо.",
            ),
            refId:   $token->getToken(),
        );
    }
}
