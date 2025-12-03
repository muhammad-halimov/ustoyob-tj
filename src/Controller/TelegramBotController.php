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
        $config = [
            "telegram" => [
                "token" => $_ENV['TELEGRAM_BOT_TOKEN']
            ]
        ];

        DriverManager::loadDriver(TelegramDriver::class);
        $botman = BotManFactory::create($config);

        $botman->hears(['/start', 'start', 'старт'], function (BotMan $bot) {
            $bot->reply('👋 Привет! Бот для уведомления о новых заявках в ТП запущен | ustoyob.tj');
        });

        $botman->hears(['hello', 'привет'], function (BotMan $bot) {
            $bot->reply('Hello yourself! 🎉');
        });

        // Обработка ВСЕХ сообщений (fallback)
        $botman->fallback(function (BotMan $bot) {
            $bot->reply('Попробуй: /start или start');
        });

        $botman->listen();

        return new Response('OK', Response::HTTP_OK);
    }
}
