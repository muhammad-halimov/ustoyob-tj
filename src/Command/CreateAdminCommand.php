<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\User\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Создаёт администратора вручную через консоль.
 * Пароль вводится интерактивно и никогда не попадает в код или логи.
 * UserListener автоматически захэширует пароль перед записью в БД.
 *
 * Запуск:
 *   php bin/console app:create-admin
 */
#[AsCommand(
    name: 'app:create-admin',
    description: 'Создаёт администратора с заданным email и паролем',
)]
class CreateAdminCommand extends Command
{
    public function __construct(
        private readonly UserRepository         $userRepository,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $email = $io->ask('Email администратора', 'admin@admin.com', function (?string $value): string {
            $value = trim((string) $value);
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('Некорректный email.');
            }
            return $value;
        });

        if ($this->userRepository->findOneBy(['email' => $email])) {
            $io->error("Пользователь с email «{$email}» уже существует.");
            return Command::FAILURE;
        }

        $password = $io->askHidden('Пароль (не отображается)', function (?string $value): string {
            $value = (string) $value;
            if (strlen($value) < 8) {
                throw new \InvalidArgumentException('Пароль должен содержать не менее 8 символов.');
            }
            return $value;
        });

        $confirm = $io->askHidden('Повторите пароль');
        if ($password !== $confirm) {
            $io->error('Пароли не совпадают.');
            return Command::FAILURE;
        }

        $admin = (new User())
            ->setEmail($email)
            ->setRoles(['ROLE_ADMIN'])
            ->setPassword($password) // UserListener захэширует при prePersist
            ->setActive(true)
            ->setApproved(true);

        $this->em->persist($admin);
        $this->em->flush();

        $io->success("Администратор «{$email}» успешно создан.");

        return Command::SUCCESS;
    }
}
