<?php

namespace App\EventListener;

use App\Entity\TechSupport\TicketApproval;
use App\Service\Extra\MercurePublisher;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Публикует в Mercure сигналы для мгновенного обновления списка в
 * TicketApprovalCrudController (очередь на подтверждение админом):
 *   - "created" — появилась новая заявка (объявление создано/отредактировано).
 *   - "approved" — заявку кто-то одобрил (уходит из очереди "на рассмотрении").
 *
 * Список в EasyAdmin — обычный серверный Twig-рендеринг, а не SPA: события
 * НЕ патчат таблицу построчно, а просто говорят фронту "показать баннер
 * 'Есть обновления'" (см. assets/js/ticketApprovalCrud.js) — админ сам решает,
 * когда перечитать список, не теряя текущую страницу/фильтры/прокрутку.
 *
 * Топик один общий "ticket-approvals", не по конкретной заявке: очередь
 * общая на всех ROLE_SUPER_ADMIN (см. TicketApprovalCrudController::
 * configureCrud — setEntityPermission('ROLE_SUPER_ADMIN')), а не персональная
 * у каждого назначенного администранта.
 *
 * ОТДЕЛЬНЫЙ листенер, а не ветка в TicketApprovalListener: тот отвечает за
 * email/Telegram-уведомление КОНКРЕТНОМУ назначенному админу, это — за live-
 * обновление списка у ВСЕХ, кто сейчас смотрит на очередь. Разные получатели,
 * разный транспорт, незачем смешивать в одном классе.
 */
#[AsEntityListener(event: Events::postPersist, entity: TicketApproval::class)]
#[AsEntityListener(event: Events::preUpdate, entity: TicketApproval::class)]
#[AsEntityListener(event: Events::postUpdate, entity: TicketApproval::class)]
class TicketApprovalListMercureListener
{
    private const string TOPIC = 'ticket-approvals';

    /** @var array<int, true> Заявки (по spl_object_id) с переходом approved false → true в этом update */
    private array $pendingApproved = [];

    public function __construct(private readonly MercurePublisher $mercurePublisher) {}

    public function postPersist(TicketApproval $ticketApproval): void
    {
        $this->mercurePublisher->publishRaw(self::TOPIC, 'created', ['id' => (string) $ticketApproval->getId()]);
    }

    public function preUpdate(TicketApproval $ticketApproval, PreUpdateEventArgs $event): void
    {
        if (!$event->hasChangedField('approved')) return;

        if ($event->getOldValue('approved') === false && $event->getNewValue('approved') === true) {
            $this->pendingApproved[spl_object_id($ticketApproval)] = true;
        }
    }

    public function postUpdate(TicketApproval $ticketApproval, PostUpdateEventArgs $event): void
    {
        $key = spl_object_id($ticketApproval);

        if (!isset($this->pendingApproved[$key])) return;
        unset($this->pendingApproved[$key]);

        $this->mercurePublisher->publishRaw(self::TOPIC, 'approved', ['id' => (string) $ticketApproval->getId()]);
    }
}
