<?php

namespace App\Command;

use App\Service\Extra\PhoneNumberUtil;
use App\Service\Notification\Sms\SmsException;
use App\Service\Notification\Sms\TwilioSmsSender;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Проверка Twilio: php bin/console app:sms:test +992901234567
 *
 * Шлёт тестовое SMS напрямую, мимо кодов и лимитов (PhoneCodeService) — чтобы
 * отделить «Twilio не настроен / отказывает» от всего остального. Ошибку
 * Twilio печатает как есть (код ошибки → https://www.twilio.com/docs/api/errors).
 */
#[AsCommand(name: 'app:sms:test', description: 'Тестовое SMS через Twilio')]
class SmsTestCommand extends Command
{
    public function __construct(private readonly TwilioSmsSender $sms)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('phone', InputArgument::REQUIRED, 'Номер, например +992901234567');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $phone = PhoneNumberUtil::normalize($input->getArgument('phone'));
        if ($phone === null) {
            $io->error('Это не номер телефона. Пример: +992901234567');
            return Command::FAILURE;
        }

        if (!$this->sms->isConfigured()) {
            $io->error('Twilio не настроен: нужны TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN и TWILIO_FROM или TWILIO_MESSAGING_SERVICE_SID в .env.local');
            return Command::FAILURE;
        }

        try {
            $this->sms->send($phone, 'Test SMS: ustoyob.tj');
        } catch (SmsException $e) {
            $io->error($e->getMessage());
            return Command::FAILURE;
        }

        $io->success("Twilio принял SMS на {$phone}. Не пришло — смотрите Twilio Console → Monitor → Logs → Messaging.");
        return Command::SUCCESS;
    }
}
