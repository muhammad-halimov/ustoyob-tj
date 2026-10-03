<?php

namespace App\Service\Notification\Telegram;

use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\User;
use App\Service\Notification\Abstract\AbstractAppealNotificationService;

class NotifyNewAppealTelegramBotService extends AbstractAppealNotificationService
{
    public function sendAppealNotification(User $user, Appeal $appeal): bool
    {
        $telegramId = $user->getTelegramChatId();

        if (!$telegramId) return false;

        $desc = mb_substr($appeal->getDescription() ?? '', 0, 300);
        $desc .= mb_strlen($appeal->getDescription() ?? '') > 300 ? '…' : '';

        $divider = '▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️';

        $message =
            "🚨 <b>Новая жалоба</b>\n" .
            "{$divider}\n\n" .
            "📌 Заголовок: <b>{$appeal->getTitle()}</b>\n\n" .
            "📁 Тип: {$appeal->getTypeLabel()}\n" .
            "🎯 На: {$this->subject($appeal)}\n" .
            "📂 Причина: {$this->reason($appeal)}\n" .
            "👤 Истец: " . ($appeal->getAuthor()?->getContact() ?? 'Неизвестен') . "\n" .
            "👤 Ответчик: " . ($appeal->getRespondent()?->getContact() ?? '—') . "\n\n" .
            "📝 {$desc}\n\n" .
            "{$divider}\n" .
            "🔗 Ссылка: <a href='{$this->appealAdminUrl($appeal)}'>Открыть в админке</a>";

        return $this->sendTelegram($telegramId, $message);
    }
}
