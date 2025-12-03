<?php

namespace App\Service;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;

class NotifyTechSupportTelegramBotService
{
    private string $botToken;

    public function __construct()
    {
        $this->botToken = $_ENV['TELEGRAM_BOT_TOKEN'];
    }

    /**
     * Отправка уведомления о новой заявке в ТП
     */
    public function sendTechSupportNotification(User $user, TechSupport $techSupport): bool
    {
        // Проверяем есть ли у админа Telegram ID
        $telegramId = $user->getTelegramChatId();

        if (!$telegramId) {
            return false; // У админа нет Telegram ID
        }

        // Формируем сообщение
        $message = $this->formatTechSupportMessage($techSupport);

        // Отправляем
        return $this->sendMessage($telegramId, $message);
    }

    /**
     * Форматирование сообщения о заявке
     */
    private function formatTechSupportMessage(TechSupport $techSupport): string
    {
        $status = match($techSupport->getStatus()) {
            'new' => '🆕 Новая',
            'renewed' => '🔄 Возобновлена',
            'in_progress' => '⏳ В работе',
            'closed' => '✅ Закрыта',
            default => $techSupport->getStatus(),
        };

        return sprintf(
            "🎫 <b>Новая заявка в ТП</b>\n\n" .
            "📋 <b>ID:</b> #%d\n" .
            "📊 <b>Статус:</b> %s\n" .
            "👤 <b>Клиент:</b> %s\n" .
            "📝 <b>Тема:</b> %s\n" .
            "💬 <b>Описание:</b> %s\n\n" .
            "🔗 <a href='https://admin.ustoyob.tj/admin?crudAction=detail&crudControllerFqcn=App\Controller\Admin\TechSupport\TechSupportCrudController&entityId=%d'>Открыть в админке</a>",
            $techSupport->getId(),
            $status,
            $techSupport->getAuthor() ? $techSupport->getAuthor()->getEmail() : 'Неизвестен',
            $techSupport->getTitle() ?? 'Без темы',
            mb_substr($techSupport->getDescription() ?? '', 0, 100) . '...',
            $techSupport->getId()
        );
    }

    /**
     * Отправка сообщения в Telegram
     */
    private function sendMessage(string $chatId, string $message): bool
    {
        $url = "https://api.telegram.org/bot$this->botToken/sendMessage";

        $data = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML', // Поддержка HTML форматирования
            'disable_web_page_preview' => true,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }
}
