<?php

namespace App\Service\Notification;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Service\Extra\AbstractTechSupportNotificationService;

/**
 * Telegram-канал уведомлений о тикетах ТП.
 *
 * Если telegramChatId не задан — уведомление не отправляется тихо.
 *
 * ENV:
 *   TELEGRAM_BOT_TOKEN — токен бота
 *   TELEGRAM_API_URL   — https://api.telegram.org
 */
class NotifyTechSupportTelegramBotService extends AbstractTechSupportNotificationService
{
    public function sendTechSupportNotification(User $user, TechSupport $techSupport): bool
    {
        $telegramId = $user->getTelegramChatId();

        if (!$telegramId) return false;

        $desc = mb_substr($techSupport->getDescription(), 0, 30) . '...';
        $imgs = $techSupport->getTechSupportMessages()->first()
            ? $techSupport->getTechSupportMessages()->first()->getImages()->count()
            : 0;

        $message =
            "🆕 Новая заявка в ТП\n\n" .
            "📌 <b>{$techSupport->getTitle()}</b>\n" .
            "📂 {$this->reason($techSupport)} | 📊 {$this->status($techSupport)} | ⚡ {$this->priority($techSupport)}\n" .
            "👤 {$techSupport->getAuthor()->getEmail()}\n" .
            "📝 {$desc}\n" .
            "💬 {$techSupport->getTechSupportMessages()->count()} сообщ. | 🖼 {$imgs} фото\n\n" .
            "🔗 <a href='{$this->techSupportAdminUrl($techSupport)}'>Открыть в админке</a>";

        return $this->sendTelegram($telegramId, $message);
    }

    private function sendTelegram(string $chatId, string $message): bool
    {
        $ch = curl_init("{$_ENV['TELEGRAM_API_URL']}/bot{$_ENV['TELEGRAM_BOT_TOKEN']}/sendMessage");

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true
            ]),
            CURLOPT_POST           => 1,
            CURLOPT_TIMEOUT        => 10,
        ]);

        curl_exec($ch);
        curl_close($ch);

        return curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
    }
}
