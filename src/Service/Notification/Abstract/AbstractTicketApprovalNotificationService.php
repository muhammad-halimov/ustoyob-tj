<?php

namespace App\Service\Notification\Abstract;

use App\Entity\TechSupport\TicketApproval;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Базовый класс для уведомлений о новых тикетах.
 *
 * Инкапсулирует общее:
 *   - Генерацию URL заверения тикета в админке
 *   - Извлечение category/budget из Ticket (см. reason/status/priority
 *     в AbstractTechSupportNotificationService — тот же приём)
 *   - Отправка уведомления
 *
 * Конкретные каналы (email, Telegram) реализуют sendTicketApprovalNotification().
 */
abstract class AbstractTicketApprovalNotificationService extends AbstractMailerService
{
    public function __construct(protected readonly UrlGeneratorInterface $urlGenerator) {}

    abstract public function sendTicketApprovalNotification(User $user, TicketApproval $ticketApproval): mixed;

    protected function ticketApprovalAdminUrl(TicketApproval $ticketApproval): string
    {
        return $this->urlGenerator->generate(
            'admin_ticket_approval_edit',
            ['entityId' => $ticketApproval->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );
    }

    protected function category(?Ticket $ticket): string
    {
        return $ticket?->getCategory()?->getTitle() ?? 'Не указана';
    }

    protected function budget(?Ticket $ticket): string
    {
        if ($ticket?->getNegotiableBudget()) return 'Договорная';

        return $ticket?->getBudget() !== null ? "{$ticket->getBudget()} TJS" : 'Не указан';
    }

    /**
     * Email автора тикета — БАГФИКС (05.09.2026, по жалобе "автор
     * куда-то пропал"): у Ticket ровно ОДНО из двух полей заполнено, никогда
     * оба сразу — $author (объявление от клиента, ROLE_CLIENT) либо $master
     * (услуга от мастера, ROLE_MASTER), см. ApiPostTicketController::
     * handle() — при создании явно выставляется одно и обнуляется другое
     * (setAuthor($bearer)->setMaster(null) либо наоборот). Уведомления
     * проверяли ТОЛЬКО getAuthor() — то есть каждая заявка от мастера (а не
     * от клиента) уходила с "Неизвестен" вместо реального email, хотя автор
     * был прекрасно известен, просто лежал в другом поле. Тот же приём
     * (getAuthor() ?? getMaster()) уже применяется в
     * ApiPostUniversalImageController — переиспользуем его здесь, а не
     * дублируем в каждом из двух notification-сервисов по отдельности.
     */
    protected function owner(?Ticket $ticket): string
    {
        return ($ticket?->getAuthor() ?? $ticket?->getMaster())?->getContact() ?? 'Неизвестен';
    }
}
