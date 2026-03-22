<?php

namespace App\Service\Notification;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Отправляет администратору Telegram-уведомление при изменениях
 * тикета техподдержки.
 *
 * Почему curl вместо Symfony HttpClient?
 *   Telegram Bot API не требует никаких Symfony-зависимостей.
 *   Прямой curl проще для изолированного HTTP-вызова без лишних зависимостей.
 *
 * Требует заполненного User::$telegramChatId у админа.
 * Если telegramChatId не задан — уведомление не отправляется тихо.
 *
 * ENV-переменные:
 *   TELEGRAM_BOT_TOKEN — токен бота (получить у @BotFather)
 *   TELEGRAM_API_URL   — базовый URL API (https://api.telegram.org)
 */
class NotifyTechSupportTelegramBotService
{
    private string $botToken;
    private string $telegramApiUrl;

    public function __construct(private readonly UrlGeneratorInterface $urlGenerator)
    {
        $this->botToken = $_ENV['TELEGRAM_BOT_TOKEN'];
        $this->telegramApiUrl = $_ENV['TELEGRAM_API_URL'];
    }

    /**
     * Отправка уведомления о новой заявке в ТП
     */
    public function sendTechSupportNotification(User $user, TechSupport $techSupport): bool
    {
        // Проверяем есть ли у админа Telegram ID
        $telegramId = $user->getTelegramChatId();

        if (!$telegramId) return false; // У админа нет Telegram ID

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
        $techSupportUrl = $this->urlGenerator->generate(
            'admin_tech_support_edit',
            ['entityId' => $techSupport->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        $reasonLabel = $techSupport->getReason()?->getTitle() ?? $techSupport->getReason()?->getCode() ?? 'Не указано';
        $statusLabel = array_search($techSupport->getStatus(), TechSupport::STATUSES);
        $priorityLabel = array_search($techSupport->getPriority(), TechSupport::PRIORITIES);
        $descriptionLabel = mb_substr($techSupport->getDescription(), 0, 30) . '...';

        return
            "🆕 Новая заявка в ТП\n\n" .
            "📌 Заголовок: <b>{$techSupport->getTitle()}</b>\n" .
            "📂 Категория: <b>$reasonLabel</b>\n" .
            "📊 Статус: <b>$statusLabel</b>\n" .
            "⚡  Приоритет: <b>$priorityLabel</b>\n" .
            "👤 Пользователь: <b>{$techSupport->getAuthor()->getEmail()}</b>\n" .
            "📝 Описание: <b>$descriptionLabel</b>\n" .
            "💬 Сообщений: <b>{$techSupport->getTechSupportMessages()->count()}</b>\n" .
            "🖼 Фото: <b>{$techSupport->getTechSupportMessages()->first()->getImages()->count()}</b>\n\n" .
            "🔗 <a href='$techSupportUrl'>Открыть в админке</a>";
    }

    /**
     * Отправка сообщения в Telegram
     */
    private function sendMessage(string $chatId, string $message): bool
    {
        $url = "$this->telegramApiUrl/bot$this->botToken/sendMessage";

        $data = [
            'chat_id'                  => $chatId,
            'text'                     => $message,
            'parse_mode'               => 'HTML', // Поддержка HTML-тегов (<b>, <a>)
            'disable_web_page_preview' => true,   // Не показывать превью ссылки EasyAdmin
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // вернуть ответ как строку, а не выводить
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (!$response) dump(curl_error($ch));
        else dump($response);

        curl_close($ch);

        // Telegram возвращает 200 при успехе; 400/403/404 — ошибка запроса
        return $httpCode === 200;
    }
}
