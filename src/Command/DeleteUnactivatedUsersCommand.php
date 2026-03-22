<?php

namespace App\Command;

use App\Repository\User\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Удаляет пользователей, которые зарегистрировались, но так и не активировали
 * аккаунт (active = false, approved = false) в течение заданного числа дней.
 *
 * Запуск вручную:
 *   php bin/console app:delete-unactivated-users
 *   php bin/console app:delete-unactivated-users --days=14   # другой порог
 *   php bin/console app:delete-unactivated-users --dry-run   # без реального удаления
 *
 * Рекомендуемая настройка cron (на сервере, раз в сутки в 03:00):
 *   0 3 * * * /usr/bin/php /var/www/html/bin/console app:delete-unactivated-users --env=prod >> /var/log/delete-unactivated.log 2>&1
 *
 * Через Symfony Scheduler (если используется symfony/scheduler):
 *   #[AsPeriodicTask(frequency: '1 day', jitter: 60)]
 */
#[AsCommand(
    name: 'app:delete-unactivated-users',
    description: 'Удаляет профили пользователей, не активировавших аккаунт за указанный период',
)]
class DeleteUnactivatedUsersCommand extends Command
{
    // Порог по умолчанию — 7 дней
    private const DEFAULT_DAYS = 7;

    public function __construct(
        private readonly UserRepository         $userRepository,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption(
                'days',
                'd',
                InputOption::VALUE_OPTIONAL,
                'Минимальный возраст неактивированного аккаунта в днях',
                self::DEFAULT_DAYS,
            )
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'Показать, что будет удалено, без реального удаления (безопасный режим)',
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io     = new SymfonyStyle($input, $output);
        $days   = (int) $input->getOption('days');
        $dryRun = (bool) $input->getOption('dry-run');

        if ($days <= 0) {
            $io->error('Параметр --days должен быть положительным числом.');
            return Command::FAILURE;
        }

        $io->title("Удаление неактивированных аккаунтов (порог: {$days} дн.)");

        if ($dryRun) {
            $io->note('Режим dry-run: удаление не выполняется.');
        }

        // Получаем всех пользователей, у которых active=false, approved=false
        // и дата регистрации старше $days дней
        $users = $this->userRepository->findUnactivatedOlderThan($days);

        if (empty($users)) {
            $io->success('Нет аккаунтов для удаления.');
            return Command::SUCCESS;
        }

        $io->table(
            ['ID', 'Email', 'Login', 'Дата регистрации'],
            array_map(fn($u) => [
                $u->getId(),
                $u->getEmail() ?? '—',
                $u->getLogin() ?? '—',
                $u->getCreatedAt()->format('Y-m-d H:i'),
            ], $users),
        );

        $count = count($users);

        if ($dryRun) {
            $io->warning("Dry-run: было бы удалено {$count} пользователей.");
            return Command::SUCCESS;
        }

        // Удаляем пачкой через remove() + один flush() в конце,
        // чтобы не делать отдельный запрос на каждый объект.
        // Cascade на связях (phones, socialNetworks и т.д.) сработает автоматически
        // через orphanRemoval / cascade=remove в маппинге Entity.
        foreach ($users as $user) {
            $this->em->remove($user);
        }

        $this->em->flush();

        $io->success("Удалено {$count} неактивированных аккаунтов.");

        return Command::SUCCESS;
    }
}
