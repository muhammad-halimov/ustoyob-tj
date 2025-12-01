<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use BotMan\BotMan\BotMan;
use BotMan\BotMan\BotManFactory;
use BotMan\BotMan\Drivers\DriverManager;
use BotMan\Drivers\Telegram\TelegramDriver;

class TelegramBotController extends AbstractController
{
    #[Route('/webhook', name: 'bot_webhook', methods: ['POST'])]
    public function webhook(Request $request): Response
    {
        // Логируем входящие данные
        $data = $request->getContent();
        file_put_contents('/tmp/telegram_webhook.log',
            date('Y-m-d H:i:s') . " RAW: " . $data . "\n\n",
            FILE_APPEND
        );

        $config = [
            "telegram" => [
                "token" => $_ENV['TELEGRAM_BOT_TOKEN']
            ]
        ];

        DriverManager::loadDriver(TelegramDriver::class);
        $botman = BotManFactory::create($config);

        // Логируем что BotMan получил
        file_put_contents('/tmp/telegram_webhook.log',
            date('Y-m-d H:i:s') . " CONFIG: " . print_r($config, true) . "\n\n",
            FILE_APPEND
        );

        $botman->hears('start', function (BotMan $bot) {
            file_put_contents('/tmp/telegram_webhook.log',
                date('Y-m-d H:i:s') . " MATCHED: start\n\n",
                FILE_APPEND
            );
            $bot->reply('👋 Привет! Напиши hello.');
        });

        $botman->hears('hello', function (BotMan $bot) {
            file_put_contents('/tmp/telegram_webhook.log',
                date('Y-m-d H:i:s') . " MATCHED: hello\n\n",
                FILE_APPEND
            );
            $bot->reply('Hello yourself! 🎉');
        });

        // Обработка ВСЕХ сообщений (fallback)
        $botman->fallback(function (BotMan $bot) {
            file_put_contents('/tmp/telegram_webhook.log',
                date('Y-m-d H:i:s') . " FALLBACK triggered\n\n",
                FILE_APPEND
            );
            $bot->reply('Я получил твоё сообщение, но не понял команду. Попробуй: /start или hello');
        });

        $botman->listen();

        return new Response('OK', Response::HTTP_OK);
    }
}
