<?php

namespace App\Service\Extra;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Базовый класс для уведомлений о тикетах техподдержки.
 *
 * Инкапсулирует общее:
 *   - Генерацию URL тикета в админке
 *   - Извлечение reason / status / priority из TechSupport
 *
 * Конкретные каналы (email, Telegram) реализуют sendTechSupportNotification().
 */
abstract class AbstractTechSupportNotificationService extends AbstractMailerService
{
    public function __construct(protected readonly UrlGeneratorInterface $urlGenerator) {}

    abstract public function sendTechSupportNotification(User $user, TechSupport $techSupport): mixed;

    protected function techSupportAdminUrl(TechSupport $techSupport): string
    {
        return $this->urlGenerator->generate(
            'admin_tech_support_edit',
            ['entityId' => $techSupport->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );
    }

    protected function reason(TechSupport $techSupport): string
    {
        return $techSupport->getReason()?->getTitle() ?? $techSupport->getReason()?->getCode() ?? 'Не указано';
    }

    protected function status(TechSupport $techSupport): string
    {
        return array_search($techSupport->getStatus(), TechSupport::STATUSES);
    }

    protected function priority(TechSupport $techSupport): string
    {
        return array_search($techSupport->getPriority(), TechSupport::PRIORITIES);
    }
}
