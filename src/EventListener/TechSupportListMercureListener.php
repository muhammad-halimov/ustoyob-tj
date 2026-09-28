<?php

namespace App\EventListener;

use App\Entity\TechSupport\TechSupport;
use App\Service\Extra\MercurePublisher;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Публикует в Mercure сигналы для мгновенного обновления списка в
 * TechSupportCrudController — тот же приём, что и
 * TicketApprovalListMercureListener для очереди подтверждений (см. её
 * докблок за общее обоснование "баннер, а не построчный патч таблицы").
 *
 * Топик "tech-supports-queue", а НЕ "tech-support:{id}" — тот уже занят
 * приватным 1:1-каналом переписки конкретного тикета (см.
 * ApiGetTechSupportSubscribeTokenController/TechSupportMessageListener) и
 * доступен только автору+администранту, а не всем ROLE_SUPER_ADMIN.
 *
 * Отслеживаемые поля — status/administrant/priority (то, что реально важно
 * админу, мониторящему очередь: новый статус, переназначение, приоритет),
 * а НЕ title/description — правка текста тикета не требует общего оповещения
 * всех админов баннером.
 *
 * ОТДЕЛЬНЫЙ листенер, а не ветка в TechSupportListener: тот шлёт email/
 * Telegram КОНКРЕТНОМУ (назначенному) админу, это — live-обновление списка
 * у ВСЕХ, кто сейчас смотрит очередь целиком.
 */
#[AsEntityListener(event: Events::postPersist, entity: TechSupport::class)]
#[AsEntityListener(event: Events::preUpdate, entity: TechSupport::class)]
#[AsEntityListener(event: Events::postUpdate, entity: TechSupport::class)]
class TechSupportListMercureListener
{
    private const string TOPIC = 'tech-supports-queue';

    private const array WATCHED_FIELDS = ['status', 'administrant', 'priority'];

    /** @var array<int, true> Тикеты (по spl_object_id) с изменением одного из WATCHED_FIELDS в этом update */
    private array $pendingUpdate = [];

    public function __construct(private readonly MercurePublisher $mercurePublisher) {}

    public function postPersist(TechSupport $techSupport): void
    {
        $this->mercurePublisher->publishRaw(self::TOPIC, 'created', ['id' => (string) $techSupport->getId()]);
    }

    public function preUpdate(TechSupport $techSupport, PreUpdateEventArgs $event): void
    {
        foreach (self::WATCHED_FIELDS as $field) {
            if ($event->hasChangedField($field)) {
                $this->pendingUpdate[spl_object_id($techSupport)] = true;
                return;
            }
        }
    }

    public function postUpdate(TechSupport $techSupport, PostUpdateEventArgs $event): void
    {
        $key = spl_object_id($techSupport);

        if (!isset($this->pendingUpdate[$key])) return;
        unset($this->pendingUpdate[$key]);

        $this->mercurePublisher->publishRaw(self::TOPIC, 'updated', ['id' => (string) $techSupport->getId()]);
    }
}
