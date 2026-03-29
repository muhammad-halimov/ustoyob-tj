<?php

namespace App\EventListener;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Repository\User\UserRepository;
use App\Service\Notification\NotifyTechSupportEmailService;
use App\Service\Notification\NotifyTechSupportTelegramBotService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Обрабатывает бизнес-логику тикетов техподдержки:
 *
 *  prePersist  — назначает наименее загруженного администратора и задаёт
 *                начальный статус «new» (до записи в БД)
 *  postPersist — отправляет уведомление назначенному администратору
 *                (после успешной записи, когда у тикета есть ID)
 *  postUpdate  — уведомляет при любом изменении тикета (смена статуса,
 *                ответ пользователя и т.д.)
 *
 * Балансировка нагрузки:
 *   При создании каждого нового тикета мы ищем администратора с наименьшим
 *   числом активных тикетов (статусы: new / renewed / in_progress).
 *   Это простой алгоритм round-robin по нагрузке без внешних очередей.
 */
#[AsEntityListener(event: Events::prePersist, entity: TechSupport::class)]
#[AsEntityListener(event: Events::postPersist, entity: TechSupport::class)]
#[AsEntityListener(event: Events::postUpdate, entity: TechSupport::class)]
readonly class TechSupportListener
{
    public function __construct(
        private NotifyTechSupportTelegramBotService $telegramNotifier,
        private NotifyTechSupportEmailService       $emailNotifier,
        private TechSupportRepository               $techSupportRepository,
        private UserRepository                      $userRepository,
    ){}

    /**
     * До создания ТП задаем наименее загруженного админа
     */
    public function prePersist(TechSupport $techSupport): void
    {
        // Устанавливаем статус "new" если не задан
        if ($techSupport->getStatus() === null) $techSupport->setStatus('new');

        // Назначаем наименее загруженного администратора
        $this->setLessLoadedAdmin($techSupport);
    }

    /**
     * После создания ТП отправляем уведомление на почту и тг админа
     * @throws TransportExceptionInterface
     */
    public function postPersist(TechSupport $techSupport): void
    {
        if (!in_array('ROLE_ADMIN', $techSupport->getAdministrant()->getRoles())) return;

        $this->telegramNotifier->sendTechSupportNotification(user: $techSupport->getAdministrant(), techSupport: $techSupport);
        $this->emailNotifier->sendTechSupportNotification(user: $techSupport->getAdministrant(), techSupport: $techSupport);
    }

    /**
     * При обновлении ТП отправляем уведомление на почту и тг админа
     * @throws TransportExceptionInterface
     */
    public function postUpdate(TechSupport $techSupport): void
    {
        if (!in_array('ROLE_ADMIN', $techSupport->getAdministrant()->getRoles())) return;

        $this->telegramNotifier->sendTechSupportNotification(user: $techSupport->getAdministrant(), techSupport: $techSupport);
        $this->emailNotifier->sendTechSupportNotification(user: $techSupport->getAdministrant(), techSupport: $techSupport);
    }

    /**
     * Задание наименее загруженного админа
     */
    private function setLessLoadedAdmin(TechSupport $techSupport): void
    {
        // Получаем всех администраторов
        /** @var User[] $admins */
        $admins = $this->userRepository->findAllByRole('ROLE_ADMIN');

        if (empty($admins)) return; // Нет доступных администраторов

        $minActiveTechSupports = PHP_INT_MAX;

        /** @var User $leastLoadedAdmin */
        $leastLoadedAdmin = null;

        foreach ($admins as $admin) {
            // Подсчитываем количество активных ТП для каждого админа
            $activeTechSupportsCount = $this->techSupportRepository->count([
                'administrant' => $admin,
                'status' => ['new', 'renewed', 'in_progress'], // Только активные статусы
            ]);

            if ($activeTechSupportsCount < $minActiveTechSupports) {
                $minActiveTechSupports = $activeTechSupportsCount;
                $leastLoadedAdmin = $admin;
            }
        }

        // Назначаем найденного администратора
        if ($leastLoadedAdmin !== null) $techSupport->setAdministrant($leastLoadedAdmin);
    }
}
