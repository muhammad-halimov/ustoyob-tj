<?php

namespace App\Service;

use App\Entity\User;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

/**
 * Сервис управления онлайн-присутствием пользователя.
 *
 * Вызывается из двух мест:
 *  1. UserPresenceController (POST /api/users/ping и POST /api/users/offline)
 *     — по команде от фронтенда
 *  2. MarkUsersOfflineCommand — как страховка для случаев краша браузера
 *
 * Топик Mercure: "user-status:{userId}"
 * private: false — токену подписки не нужно явно включать этот топик в claims.
 */
class UserPresenceService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly HubInterface           $hub,
    ) {}

    /**
     * Переводит пользователя в онлайн, обновляет lastSeen.
     * Публикует в Mercure только при смене статуса (offline→online),
     * чтобы не флудить при каждом heartbeat-пинге.
     */
    public function markOnline(User $user): void
    {
        $wasOnline = $user->isOnline();

        $user->setIsOnline(true);
        $user->setLastSeen(new DateTimeImmutable());
        $this->em->flush();

        if (!$wasOnline) {
            $this->publishStatus($user);
        }
    }

    /**
     * Переводит пользователя в офлайн и публикует событие в Mercure.
     */
    public function markOffline(User $user): void
    {
        if (!$user->isOnline()) return;

        $user->setIsOnline(false);
        $this->em->flush();

        $this->publishStatus($user);
    }

    /**
     * Публикует текущий статус пользователя в Mercure.
     * Вызывается при смене статуса в любую сторону.
     */
    public function publishStatus(User $user): void
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
