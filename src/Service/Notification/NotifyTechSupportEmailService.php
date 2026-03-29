<?php

namespace App\Service\Notification;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Service\Extra\AbstractTechSupportNotificationService;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Email-канал уведомлений о тикетах ТП.
 */
class NotifyTechSupportEmailService extends AbstractTechSupportNotificationService
{

    /** @throws TransportExceptionInterface */
    public function sendTechSupportNotification(User $user, TechSupport $techSupport): string
    {
        $url      = $this->techSupportAdminUrl($techSupport);
        $siteName = $this->siteName();
        $title    = htmlspecialchars($techSupport->getTitle(), ENT_QUOTES, 'UTF-8');
        $desc     = htmlspecialchars($techSupport->getDescription(), ENT_QUOTES, 'UTF-8');
        $author   = htmlspecialchars($techSupport->getAuthor()->getEmail(), ENT_QUOTES, 'UTF-8');
        $msgs     = $techSupport->getTechSupportMessages()->count();
        $imgs     = $techSupport->getTechSupportMessages()->first()
            ? $techSupport->getTechSupportMessages()->first()->getImages()->count()
            : 0;

        return $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Новая заявка в ТП | {$siteName}",
            text:    "Новая заявка в ТП\n\n{$techSupport->getTitle()}\n{$this->reason($techSupport)} | {$this->status($techSupport)} | {$this->priority($techSupport)}\n{$techSupport->getAuthor()->getEmail()} | {$msgs} сообщ. | {$imgs} фото\n\n{$techSupport->getDescription()}\n\n{$url}",
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
}
