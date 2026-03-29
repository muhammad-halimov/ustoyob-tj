<?php

namespace App\Service\Extra;

use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;

/**
 * Базовый класс для email-сервисов.
 *
 * Инкапсулирует общий паттерн:
 *   - Создание Email (from/to/subject/text/html)
 *   - Заголовки X-Mailer и X-Entity-Ref-ID
 *   - Синхронная отправка через Transport::fromDsn
 *   - Доступ к ENV-переменным MAILER_SENDER, MAILER_DSN, FRONTEND_URL
 */
abstract class AbstractMailerService
{
    protected function siteName(): string { return $_ENV['FRONTEND_URL']; }

    protected function htmlEmail(string $title, string $body, string $footer): string
    {
        return '<!DOCTYPE html><html lang="ru-RU"><head><meta charset="UTF-8"></head><body>'
            . '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">'
            . "<h1 style=\"color:#667eea\">{$title}</h1>"
            . $body
            . '<hr style="margin:30px 0;border:none;border-top:1px solid #eee">'
            . "<p style=\"color:#999;font-size:12px\">{$footer}</p>"
            . '</div></body></html>';
    }

    protected function htmlButton(string $href, string $label): string
    {
        return '<p style="margin:30px 0">'
            . "<a href=\"{$href}\" style=\"background:linear-gradient(135deg,#667eea,#764ba2);color:white;"
            . 'padding:15px 30px;text-decoration:none;border-radius:50px;display:inline-block;font-weight:600">'
            . $label
            . '</a></p>';
    }

    /**
     * @throws TransportExceptionInterface
     */
    protected function sendEmail(
        string $to,
        string $subject,
        string $text,
        string $html,
        string $refId,
    ): string {
        $email = (new Email())
            ->from($_ENV['MAILER_SENDER'])
            ->to($to)
            ->subject($subject)
            ->text($text)
            ->html($html);

        $headers = $email->getHeaders();
        $headers->addTextHeader('X-Mailer', 'Symfony Mailer');
        $headers->addTextHeader('X-Entity-Ref-ID', $refId);

        new Mailer(Transport::fromDsn($_ENV['MAILER_DSN']))->send($email);

        return "Письмо отправлено {$to}";
    }
}
