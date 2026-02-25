<?php

namespace App\Command;

use App\Repository\UserRepository;
use App\Service\UserPresenceService;
use DateTimeImmutable;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Страховочная команда: переводит в offline пользователей,
 * чей браузер закрылся неожиданно (краш, потеря сети, убитый таб).
 *
 * В нормальном сценарии фронтенд сам вызывает POST /api/users/offline
 * через navigator.sendBeacon. Эта команда — только резервный механизм.
 *
 * НАСТРОЙКА КРОНА (опционально, раз в 5-10 минут достаточно):
 *   *\/5 * * * * /usr/bin/php /var/www/project/bin/console app:mark-users-offline --env=prod
 *
 * ЛОКАЛЬНАЯ ПРОВЕРКА:
 *   php bin/console app:mark-users-offline
 */
#[AsCommand(
    name: 'app:mark-users-offline',
    description: 'Страховка: переводит в offline пользователей у которых lastSeen > 5 минут назад',
)]
class MarkUsersOfflineCommand extends Command
{
    private const int OFFLINE_THRESHOLD_MINUTES = 5;

    public function __construct(
        private readonly UserRepository      $userRepository,
        private readonly UserPresenceService $presenceService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $threshold = new DateTimeImmutable(sprintf('-%d minutes', self::OFFLINE_THRESHOLD_MINUTES));

        $users = $this->userRepository->findOnlineUsersLastSeenBefore($threshold);

        if (empty($users)) {
            $output->writeln('Нет пользователей для перевода в offline.');
            return Command::SUCCESS;
        }

        foreach ($users as $user) {
            $this->presenceService->markOffline($user);

            $output->writeln(sprintf(
                'Offline: user #%d (lastSeen: %s)',
                $user->getId(),
                $user->getLastSeen()?->format('H:i:s') ?? 'never'
            ));
        }

        return Command::SUCCESS;
    }
}
