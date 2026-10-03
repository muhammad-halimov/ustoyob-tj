<?php

namespace App\Service\Notification\Email;

use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use App\Service\Notification\Abstract\AbstractTechSupportNotificationService;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Email-канал уведомлений о тикетах ТП.
 */
class NotifyNewTechSupportEmailService extends AbstractTechSupportNotificationService
{
    /**
     * @param User $user
     * @param TechSupport $techSupport
     * @return string
     * @throws TransportExceptionInterface
     */
    public function sendTechSupportNotification(User $user, TechSupport $techSupport): string
    {
        $url      = $this->techSupportAdminUrl($techSupport);
        $siteName = $this->siteName();
        $title    = htmlspecialchars($techSupport->getTitle(), ENT_QUOTES, 'UTF-8');
        $desc     = htmlspecialchars($techSupport->getDescription(), ENT_QUOTES, 'UTF-8');
        $authorId = $techSupport->getAuthor()?->getContact() ?? $techSupport->getGuestEmail() ?? 'Гость';
        $author   = htmlspecialchars($authorId, ENT_QUOTES, 'UTF-8');
        $msgs     = $techSupport->getTechSupportMessages()->count();
        $imgs     = $techSupport->getTechSupportMessages()->first()
            ? $techSupport->getTechSupportMessages()->first()->getImages()->count()
            : 0;

        return $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Новая заявка в ТП | {$siteName}",
            text:    "Новая заявка в ТП\n\n{$techSupport->getTitle()}\n{$this->reason($techSupport)} | {$this->status($techSupport)} | {$this->priority($techSupport)}\n{$author} | {$msgs} сообщ. | {$imgs} фото\n\n{$techSupport->getDescription()}\n\n{$url}",
            html:    $this->htmlEmail(
                'Новая заявка в ТП',
                "<p>Заголовок: <strong>{$title}</strong></p>"
                . "<p>Категория: <strong>{$this->reason($techSupport)}</strong> | Статус: <strong>{$this->status($techSupport)}</strong> | Приоритет: <strong>{$this->priority($techSupport)}</strong></p>"
                . "<p>Пользователь: <strong>{$author}</strong> | Сообщений: <strong>{$msgs}</strong> | Фото: <strong>{$imgs}</strong></p>"
                . "<p style=\"color:#666;font-size:14px\">{$desc}</p>"
                . $this->htmlButton($url, 'Перейти в ТП'),
                "Если вы не админ на {$siteName} — проигнорируйте письмо.",
            ),
            refId:   (string) $techSupport->getId(),
        );
    }

    /**
     * @throws TransportExceptionInterface
     */
    public function sendTechSupportMessageNotification(User $user, TechSupportMessage $message): string
    {
        $techSupport = $message->getTechSupport();

        $url      = $this->techSupportAdminUrl($techSupport);
        $siteName = $this->siteName();
        $title    = htmlspecialchars($techSupport->getTitle(), ENT_QUOTES, 'UTF-8');
        $text     = htmlspecialchars($message->getDescription(), ENT_QUOTES, 'UTF-8');
        $authorId = $message->getAuthor()?->getContact() ?? $techSupport->getGuestEmail() ?? 'Гость';
        $author   = htmlspecialchars($authorId, ENT_QUOTES, 'UTF-8');
        $imgs     = $message->getImages()->count();

        return $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Новое сообщение в заявке ТП | {$siteName}",
            text:    "Новое сообщение в заявке ТП\n\n{$techSupport->getTitle()}\n{$this->status($techSupport)}\n{$author} | {$imgs} фото\n\n{$message->getDescription()}\n\n{$url}",
            html:    $this->htmlEmail(
                'Новое сообщение в заявке ТП',
                "<p>Заявка: <strong>{$title}</strong></p>"
                . "<p>Статус: <strong>{$this->status($techSupport)}</strong></p>"
                . "<p>От: <strong>{$author}</strong> | Фото: <strong>{$imgs}</strong></p>"
                . "<p style=\"color:#666;font-size:14px\">{$text}</p>"
                . $this->htmlButton($url, 'Перейти в ТП'),
                "Если вы не админ на {$siteName} — проигнорируйте письмо.",
            ),
            refId:   (string) $techSupport->getId(),
        );
    }
}
