<?php

namespace App\Command;

use App\Repository\User\DeviceTokenRepository;
use App\Repository\User\UserRepository;
use App\Service\Notification\Push\FcmClient;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Contracts\HttpClient\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Проверка push-уведомлений: php bin/console app:push:test user@example.com
 *
 * Показывает, настроен ли Firebase (FIREBASE_CREDENTIALS), какие устройства
 * пользователь зарегистрировал (приложение Android/iOS, браузер), и шлёт на
 * каждое тестовое уведомление, печатая ответ FCM как есть. Ничего не
 * удаляет — даже токены, которые FCM считает мёртвыми.
 */
#[AsCommand(name: 'app:push:test', description: 'Тестовое push-уведомление на все устройства пользователя')]
class PushTestCommand extends Command
{
    public function __construct(
        private readonly FcmClient             $fcm,
        private readonly UserRepository        $userRepository,
        private readonly DeviceTokenRepository $deviceTokenRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('email', InputArgument::REQUIRED, 'Email пользователя');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (!$this->fcm->isConfigured()) {
            $io->error('Firebase не настроен: FIREBASE_CREDENTIALS пуст, файла нет, он не читается или это не ключ сервисного аккаунта (см. README → «Push-уведомления»).');
            return Command::FAILURE;
        }
        $io->writeln("Firebase: проект <info>{$this->fcm->projectId()}</info>");

        $user = $this->userRepository->findOneBy(['email' => $input->getArgument('email')]);
        if (!$user) {
            $io->error('Пользователь с таким email не найден.');
            return Command::FAILURE;
        }

        $devices = $this->deviceTokenRepository->findBy(['user' => $user]);
        if (!$devices) {
            $io->warning('У пользователя нет зарегистрированных устройств. Войдите в приложение (и разрешите уведомления) или включите уведомления на сайте — устройство регистрируется через POST /api/device-tokens.');
            return Command::FAILURE;
        }

        $failed = 0;
        foreach ($devices as $device) {
            $label = sprintf('%s, %s, обновлён %s, токен …%s',
                $device->getPlatform(), $device->getLocale() ?? '—',
                $device->getUpdatedAt()?->format('Y-m-d H:i'), substr((string) $device->getToken(), -12));
            try {
                $response = $this->fcm->send((string) $device->getToken(), 'ustoyob.tj', 'Тестовое уведомление ✅', ['type' => 'test'], 'test', '/');
                $status = $response->getStatusCode();
                $body = $response->getContent(false);
            } catch (HttpExceptionInterface $e) {
                // Сбой до самой отправки — обычно обмен ключа сервисного аккаунта на токен Google: печатаем ответ Google.
                $status = $e->getResponse()->getStatusCode();
                $body = $e->getResponse()->getInfo('url') . ' → ' . $e->getResponse()->getContent(false);
            } catch (Throwable $e) {
                $status = 0;
                $body = $e->getMessage();
            }
            if ($status === 200) {
                $io->writeln("<info>✓</info> {$label}");
            } else {
                $failed++;
                $io->writeln("<error>✗</error> {$label}\n  HTTP {$status}: {$body}");
            }
        }

        return $failed === 0 ? Command::SUCCESS : Command::FAILURE;
    }
}
