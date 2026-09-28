<?php

namespace App\EventListener;

use App\Entity\Ticket\Ticket;
use App\Service\Extra\MercurePublisher;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Публикует в Mercure момент одобрения объявления/услуги — топик
 * "ticket:{id}" (см. ApiGetTicketSubscribeTokenController). Фронтенд
 * подключается на карточке ЕЩЁ не одобренного тикета, получает событие
 * "approved" и обновляет состояние карточки/отсоединяется.
 *
 * ОТДЕЛЬНЫЙ листенер, а не ветка в TicketListener: TicketListener
 * намеренно НЕ отслеживает поле approved (см. его NOTIFIABLE_FIELDS —
 * approved там прямым текстом исключено как служебное/вычисляемое, чтобы
 * не гонять тикет через цикл повторного одобрения на своё же изменение).
 * Здесь ровно противоположная, узкая задача — заметить ИМЕННО переход
 * approved false → true и никак иначе не трогать существующую логику.
 *
 * false → true срабатывает и от одиночного переключателя в EasyAdmin
 * (TicketApprovalCrudController — BooleanField 'approved' на TicketApproval,
 * каскадом уходит в Ticket::setApproved()), и от batchApprove — оба пути
 * идут через обычный persist/flush Ticket, значит через preUpdate/postUpdate.
 *
 * preUpdate/postUpdate, а не один хук — тот же порядок, что и в
 * TicketListener (см. его докблок): changeset виден только в preUpdate,
 * а публиковать в Mercure до того, как флаг реально записан в БД, было бы
 * преждевременно — ждём postUpdate.
 */
#[AsEntityListener(event: Events::preUpdate, entity: Ticket::class)]
#[AsEntityListener(event: Events::postUpdate, entity: Ticket::class)]
class TicketApprovalMercureListener
{
    /** @var array<int, true> Тикеты (по spl_object_id) с переходом approved false → true в этом update */
    private array $pending = [];

    public function __construct(private readonly MercurePublisher $mercurePublisher) {}

    public function preUpdate(Ticket $ticket, PreUpdateEventArgs $event): void
    {
        if (!$event->hasChangedField('approved')) return;

        if ($event->getOldValue('approved') === false && $event->getNewValue('approved') === true) {
            $this->pending[spl_object_id($ticket)] = true;
        }
    }

    public function postUpdate(Ticket $ticket, PostUpdateEventArgs $event): void
    {
        $key = spl_object_id($ticket);

        if (!isset($this->pending[$key])) return;
        unset($this->pending[$key]);

        $this->mercurePublisher->publishRaw("ticket:{$ticket->getId()}", 'approved', ['approved' => true]);
    }
}
