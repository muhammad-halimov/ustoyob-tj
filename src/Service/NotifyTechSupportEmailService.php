<?php

namespace App\Service;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

readonly class NotifyTechSupportEmailService
{
    public function __construct(private UrlGeneratorInterface  $urlGenerator) {}

    /**
     * @throws TransportExceptionInterface
     */
    public function sendTechSupportEmail(User $user, TechSupport $techSupport): string
    {
        $transport = Transport::fromDsn($_ENV['MAILER_DSN']);
        $mailer = new Mailer($transport);

        // Генерируем ссылку для подтверждения
        $techSupportUrl = $this->urlGenerator->generate(
            'admin_tech_support_edit',
            ['entityId' => $techSupport->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        $reasonLabel = array_search($techSupport->getReason(), TechSupport::SUPPORT);
        $statusLabel = array_search($techSupport->getStatus(), TechSupport::STATUSES);
        $priorityLabel = array_search($techSupport->getPriority(), TechSupport::PRIORITIES);

        // Отправляем письмо
        $email = (new Email())
            ->from($_ENV['MAILER_SENDER'])
            ->to($user->getEmail())
            ->subject("Новая заявка в ТП | {$_ENV["FRONTEND_URL"]}")
            ->html("
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h1 style='color: #667eea;'>Новая заявка в ТП</h1>
                    <p>Заголовок: <strong>{$techSupport->getTitle()}</strong></p>
                    <p>Категория: <strong>$reasonLabel</strong></p>
                    <p>Cтатус: <strong>$statusLabel</strong></p>
                    <p>Приоритет: <strong>$priorityLabel</strong></p>
                    <p>Пользователь: <strong>{$techSupport->getAuthor()->getEmail()}</strong></p>
                    <p>Сообщений: <strong>{$techSupport->getTechSupportMessages()->count()}</strong></p>
                    <p>Фотографий: <strong>{$techSupport->getTechSupportImages()->count()}</strong></p>
                    <p>Описание: </p>
                    <p style='color: #666; font-size: 14px;'>{$techSupport->getDescription()}</p>
                    <p style='margin: 30px 0;'>
                        <a href='$techSupportUrl'
                           style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                  color: white;
                                  padding: 15px 30px;
                                  text-decoration: none;
                                  border-radius: 50px;
                                  display: inline-block;
                                  font-weight: 600;'>
                            Перейти в ТП
                        </a>
                    </p>
                    <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                    <p style='color: #999; font-size: 12px;'>
                        Если вы не админ на {$_ENV['FRONTEND_URL']}, просто проигнорируйте это письмо.
                    </p>
                </div>
            ");

        $mailer->send($email);

        return "Письмо отправлено админу {$user->getEmail()}";
    }
}
