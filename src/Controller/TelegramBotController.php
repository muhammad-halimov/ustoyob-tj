<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use BotMan\BotMan\BotMan;
use BotMan\BotMan\BotManFactory;
use BotMan\BotMan\Drivers\DriverManager;
use BotMan\Drivers\Telegram\TelegramDriver;

class TelegramBotController extends AbstractController
{
    #[Route('/webhook', name: 'bot_webhook', methods: ['POST'])]
    public function webhook(): Response
    {
        $config = [
            "telegram" => [
                "token" => $_ENV['TELEGRAM_BOT_TOKEN']
            ]
        ];

        DriverManager::loadDriver(TelegramDriver::class);
        $botman = BotManFactory::create($config);

        $botman->hears('hello', function (BotMan $bot) {
            $bot->reply('Hello yourself.');
        });

        // Можете добавить больше команд
        $botman->hears('start', function (BotMan $bot) {
            $bot->reply('Привет! Я бот. Напиши "hello" чтобы поздороваться.');
        });

        $botman->listen();

        return new Response('', 200);
    }
}
