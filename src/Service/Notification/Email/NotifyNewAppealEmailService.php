<?php

namespace App\Service\Notification\Email;

use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\User;
use App\Service\Notification\Abstract\AbstractAppealNotificationService;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class NotifyNewAppealEmailService extends AbstractAppealNotificationService
{
    /**
     * @throws TransportExceptionInterface
     */
    public function sendAppealNotification(User $user, Appeal $appeal): string
    {
        $url        = $this->appealAdminUrl($appeal);
        $siteName   = $this->siteName();
        $title      = htmlspecialchars($appeal->getTitle() ?? '', ENT_QUOTES, 'UTF-8');
        $desc       = htmlspecialchars($appeal->getDescription() ?? '', ENT_QUOTES, 'UTF-8');
        $type       = htmlspecialchars($appeal->getTypeLabel(), ENT_QUOTES, 'UTF-8');
        $subject    = htmlspecialchars($this->subject($appeal), ENT_QUOTES, 'UTF-8');
        $reason     = htmlspecialchars($this->reason($appeal), ENT_QUOTES, 'UTF-8');
        $authorId   = $appeal->getAuthor()?->getContact() ?? 'Неизвестен';
        $author     = htmlspecialchars($authorId, ENT_QUOTES, 'UTF-8');
        $respondentId = $appeal->getRespondent()?->getContact() ?? '—';
        $respondent   = htmlspecialchars($respondentId, ENT_QUOTES, 'UTF-8');

        return $this->sendEmail(
            to:      $user->getEmail(),
            subject: "Новая жалоба | {$siteName}",
            text:    "Новая жалоба\n\n{$appeal->getTitle()}\nТип: {$appeal->getTypeLabel()} | На: {$this->subject($appeal)}\nПричина: {$this->reason($appeal)}\nИстец: {$authorId} | Ответчик: {$respondentId}\n\n{$appeal->getDescription()}\n\n{$url}",
            html:    $this->htmlEmail(
                'Новая жалоба',
                "<p>Заголовок: <strong>{$title}</strong></p>"
                . "<p>Тип: <strong>{$type}</strong> | На: <strong>{$subject}</strong></p>"
                . "<p>Причина: <strong>{$reason}</strong></p>"
                . "<p>Истец: <strong>{$author}</strong> | Ответчик: <strong>{$respondent}</strong></p>"
                . "<p style=\"color:#666;font-size:14px\">{$desc}</p>"
                . $this->htmlButton($url, 'Перейти в админку'),
                "Если вы не админ на {$siteName} — проигнорируйте письмо.",
            ),
            refId:   (string) $appeal->getId(),
        );
    }
}
