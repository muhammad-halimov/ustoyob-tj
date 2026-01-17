<?php

namespace App\Service\Notification;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

readonly class NotifyTechSupportEmailService
{
    public function __construct(private UrlGeneratorInterface $urlGenerator) {}

    /**
     * @throws TransportExceptionInterface
     */
    public function sendTechSupportEmail(User $user, TechSupport $techSupport): string
    {
        // Генерируем ссылку для подтверждения
        $techSupportUrl = $this->urlGenerator->generate(
            'admin_tech_support_edit',
            ['entityId' => $techSupport->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        $reasonLabel = array_search($techSupport->getReason(), TechSupport::SUPPORT);
        $statusLabel = array_search($techSupport->getStatus(), TechSupport::STATUSES);
        $priorityLabel = array_search($techSupport->getPriority(), TechSupport::PRIORITIES);

        $siteName = $_ENV['FRONTEND_URL'];
        $title = htmlspecialchars($techSupport->getTitle(), ENT_QUOTES, 'UTF-8');
        $description = htmlspecialchars($techSupport->getDescription(), ENT_QUOTES, 'UTF-8');
        $authorEmail = htmlspecialchars($techSupport->getAuthor()->getEmail(), ENT_QUOTES, 'UTF-8');
        $messagesCount = $techSupport->getTechSupportMessages()->count();
        $imagesCount = $techSupport->getTechSupportImages()->count();

        // Текстовая версия письма
        $textContent = <<<TEXT
            Новая заявка в ТП

            Заголовок: {$techSupport->getTitle()}
            Категория: {$reasonLabel}
            Статус: {$statusLabel}
            Приоритет: {$priorityLabel}
            Пользователь: {$techSupport->getAuthor()->getEmail()}
            Сообщений: {$messagesCount}
            Фотографий: {$imagesCount}

            Описание:
            {$techSupport->getDescription()}

            Ссылка на заявку:
            {$techSupportUrl}

            Если вы не админ на {$siteName}, просто проигнорируйте это письмо.
        TEXT;

        // HTML версия письма
        $htmlContent = <<<HTML
            <!DOCTYPE html>
            <html lang="ru-RU">
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h1 style="color: #667eea;">Новая заявка в ТП</h1>
                    <p>Заголовок: <strong>{$title}</strong></p>
                    <p>Категория: <strong>{$reasonLabel}</strong></p>
                    <p>Статус: <strong>{$statusLabel}</strong></p>
                    <p>Приоритет: <strong>{$priorityLabel}</strong></p>
                    <p>Пользователь: <strong>{$authorEmail}</strong></p>
                    <p>Сообщений: <strong>{$messagesCount}</strong></p>
                    <p>Фотографий: <strong>{$imagesCount}</strong></p>
                    <p>Описание:</p>
                    <p style="color: #666; font-size: 14px;">{$description}</p>
                    <p style="margin: 30px 0;">
                        <a href="{$techSupportUrl}"
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                  color: white;
                                  padding: 15px 30px;
                                  text-decoration: none;
                                  border-radius: 50px;
                                  display: inline-block;
                                  font-weight: 600;">
                            Перейти в ТП
                        </a>
                    </p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 12px;">
                        Если вы не админ на {$siteName}, просто проигнорируйте это письмо.
                    </p>
                </div>
            </body>
            </html>
        HTML;

        // Создаем письмо
        $email = (new Email())
            ->from($_ENV['MAILER_SENDER'])
            ->to($user->getEmail())
            ->subject("Новая заявка в ТП | {$siteName}")
            ->text($textContent)
            ->html($htmlContent);

        // Добавляем заголовки для улучшения доставляемости
        $headers = $email->getHeaders();
        $headers->addTextHeader('X-Entity-Ref-ID', (string)$techSupport->getId());
        $headers->addTextHeader('X-Mailer', 'Symfony Mailer');

        // Отправляем
        new Mailer(Transport::fromDsn($_ENV['MAILER_DSN']))->send($email);

        return "Письмо отправлено админу {$user->getEmail()}";
    }
}
