<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

/**
 * Управление онлайн-статусом через SSE-поток.
 *
 * Фронтенд открывает GET /api/users/presence/subscribe и держит поток.
 * Пока поток открыт — markOnline с обновлением lastSeen.
 * Когда поток закрывается — markOffline с публикацией события.
 * Никаких пингов, полинга, крона.
 */
class UserPresenceService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly HubInterface           $hub,
        private readonly UserRepository         $userRepository,
    ) {}

    /**
     * Переводит в онлайн, обновляет lastSeen.
     * Публикует Mercure событие об изменении статуса.
     */
    public function markOnline(User $user): void
    {
        $wasOnline = $user->isOnline();

        $user->setIsOnline(true);
        $user->setLastSeen(new DateTimeImmutable());
        $this->em->flush();

        // Публикуем только при смене статуса offline→online
        if (!$wasOnline) {
            $this->publishStatus($user);
        }
    }

    /**
     * Переводит в офлайн и публикует событие.
     * Вызывается когда SSE-поток закрывается.
     */
    public function markOffline(User $user): void
    {
        if (!$user->isOnline()) return;

        $user->setIsOnline(false);
        $this->em->flush();

        $this->publishStatus($user);
    }

    /**
     * Перезагружает User из БД по ID и переводит в офлайн.
     * Используется в SSE-потоке: исходный $user устаревает после долгого sleep().
     */
    public function markOfflineById(int $userId): void
    {
        $user = $this->userRepository->find($userId);
        if (!$user) return;
        $this->markOffline($user);
    }

    /**
     * Публикует статус в Mercure.
     */
    private function publishStatus(User $user): void
    {
        $this->hub->publish(new Update(
            topics: "user-status:{$user->getId()}",
            data: json_encode([
                'type' => $user->isOnline() ? 'online' : 'offline',
                'data' => [
                    'id'       => $user->getId(),
                    'isOnline' => $user->isOnline(),
                    'lastSeen' => $user->getLastSeen()?->format(DateTimeInterface::ATOM),
                ],
            ]),
            private: false,
        ));
    }
}

