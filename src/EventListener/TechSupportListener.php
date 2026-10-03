<?php

namespace App\EventListener;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Service\Extra\AdminLoadBalancerService;
use App\Service\Notification\Email\NotifyNewTechSupportEmailService;
use App\Service\Notification\NotificationDispatcher;
use App\Service\Notification\Push\PushNotifier;
use App\Service\Notification\Telegram\NotifyNewTechSupportTelegramBotService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Обрабатывает бизнес-логику тикетов техподдержки:
 *
 *  prePersist  — назначает наименее загруженного администратора и задаёт
 *                начальный статус «new» (до записи в БД)
 *  postPersist — отправляет уведомление назначенному администратору
 *                (после успешной записи, когда у тикета есть ID)
 *  preUpdate / postUpdate — ловят РУЧНОЕ переназначение администранта
 *                (PATCH /tech-supports/{id}/assign, см.
 *                ApiAssignTechSupportController) и уведомляют нового
 *                администранта тем же способом, что и при создании тикета —
 *                тот же приём отложенной side-эффекта, что
 *                TechSupportMessageListener использует для EntityRevision:
 *                changeset доступен только в preUpdate, но сайд-эффекты
 *                (отправка уведомлений) безопаснее делать в postUpdate,
 *                когда изменение уже точно записано в БД.
 *
 * Балансировка нагрузки:
 *   При создании каждого нового тикета мы ищем администратора с наименьшим
 *   числом активных тикетов (статусы: new / renewed / in_progress).
 *   Это простой алгоритм round-robin по нагрузке без внешних очередей.
 *
 * Уведомления: сначала Telegram, email — только если Telegram не прошёл
 * (см. NotificationDispatcher — общая логика для всех notify-листенеров).
 */
#[AsEntityListener(event: Events::prePersist, entity: TechSupport::class)]
#[AsEntityListener(event: Events::postPersist, entity: TechSupport::class)]
#[AsEntityListener(event: Events::preUpdate, entity: TechSupport::class)]
#[AsEntityListener(event: Events::postUpdate, entity: TechSupport::class)]
class TechSupportListener
{
    /**
     * @var array<int, User> Тикет (по spl_object_id) → новый администрант,
     * которого нужно уведомить в postUpdate. Заполняется в preUpdate —
     * единственном месте, где доступен changeset (PreUpdateEventArgs).
     */
    private array $pendingAdminChange = [];

    public function __construct(
        private readonly NotifyNewTechSupportTelegramBotService $telegramNotifier,
        private readonly NotifyNewTechSupportEmailService       $emailNotifier,
        private readonly AdminLoadBalancerService               $adminLoadBalancerService,
        private readonly NotificationDispatcher                 $dispatcher,
        private readonly Security                               $security,
        private readonly PushNotifier                           $pushNotifier,
    ){}

    /**
     * До создания ТП задаем наименее загруженного админа
     */
    public function prePersist(TechSupport $techSupport): void
    {
        // Устанавливаем статус "new" если не задан
        if ($techSupport->getStatus() === null) $techSupport->setStatus('new');

        // Назначаем наименее загруженного администратора
        $this->adminLoadBalancerService->setLeastLoadedAdmin($techSupport, ['status' => ['new', 'renewed', 'in_progress']]);
    }

    /**
     * После создания ТП отправляем уведомление админу.
     */
    public function postPersist(TechSupport $techSupport): void
    {
        $this->notifyAdmin($techSupport, $techSupport->getAdministrant());
        $this->pushNotifier->techSupportCreated($techSupport);
    }

    /**
     * Ловим смену поля administrant (ручное переназначение) — само значение
     * "было/стало" достаём здесь, пока доступен changeset; для ManyToOne
     * getNewValue() возвращает сам объект User, а не просто его id.
     */
    public function preUpdate(TechSupport $techSupport, PreUpdateEventArgs $event): void
    {
        if (!$event->hasChangedField('administrant')) return;

        $newAdmin = $event->getNewValue('administrant');
        if ($newAdmin instanceof User) {
            $this->pendingAdminChange[spl_object_id($techSupport)] = $newAdmin;
        }
    }

    public function postUpdate(TechSupport $techSupport): void
    {
        $key = spl_object_id($techSupport);
        if (!isset($this->pendingAdminChange[$key])) return;

        $newAdmin = $this->pendingAdminChange[$key];
        unset($this->pendingAdminChange[$key]);

        // Не уведомляем, если админ назначил тикет сам себе — он и так знает.
        if ($newAdmin === $this->security->getUser()) return;

        $this->notifyAdmin($techSupport, $newAdmin);
        $this->pushNotifier->techSupportAssigned($techSupport, $newAdmin);
    }

    private function notifyAdmin(TechSupport $techSupport, ?User $admin): void
    {
        // getRoles() у User виртуально достраивает ROLE_ADMIN для
        // ROLE_SUPER_ADMIN (см. User::getRoles()) — эта проверка отличается
        // от AdminLoadBalancerService::findAllAdmins() тем, что тут уже
        // готовый PHP-объект User, а не сырой SQL по колонке roles.
        if ($admin === null || !in_array('ROLE_ADMIN', $admin->getRoles())) return;

        $this->dispatcher->send(
            sendTelegram: fn() => $this->telegramNotifier->sendTechSupportNotification(user: $admin, techSupport: $techSupport),
            sendEmail:    fn() => $this->emailNotifier->sendTechSupportNotification(user: $admin, techSupport: $techSupport),
            label:        'TechSupport',
            logContext:   ['techSupportId' => $techSupport->getId(), 'adminId' => $admin->getId()],
        );
    }
}
