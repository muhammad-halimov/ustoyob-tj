<?php

namespace App\EventListener;

use App\Entity\TechSupport\TechSupport;
use App\Repository\TechSupport\TechSupportRepository;
use App\Repository\UserRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

#[AsEntityListener(event: Events::prePersist, entity: TechSupport::class)]
readonly class TechSupportListener
{
    public function __construct(
        private TechSupportRepository  $techSupportRepository,
        private UserRepository         $userRepository,
    ){}

    /**
     * До создания ТП задаем наименее загруженного админа
     */
    public function prePersist(TechSupport $techSupport, LifecycleEventArgs $args): void
    {
        // Устанавливаем статус "new" если не задан
        if ($techSupport->getStatus() === null) {
            $techSupport->setStatus('new');
        }

        // Назначаем наименее загруженного администратора
        $this->setLessLoadedAdmin($techSupport);
    }

    /**
     * Задание наименее загруженного админа
     */
    private function setLessLoadedAdmin(TechSupport $techSupport): void
    {
        // Получаем всех администраторов
        $admins = $this->userRepository->findAllByRole('ROLE_ADMIN');

        if (empty($admins)) {
            return; // Нет доступных администраторов
        }

        $leastLoadedAdmin = null;
        $minActiveTechSupports = PHP_INT_MAX;

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
        if ($leastLoadedAdmin !== null) {
            $techSupport->setAdministrant($leastLoadedAdmin);
        }
    }
}
