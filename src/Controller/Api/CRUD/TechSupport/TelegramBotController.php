<?php

namespace App\Controller\Api\CRUD\TechSupport;

use BotMan\BotMan\BotMan;
use BotMan\BotMan\BotManFactory;
use BotMan\BotMan\Drivers\DriverManager;
use BotMan\Drivers\Telegram\TelegramDriver;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

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

        $botman->hears(['/start', 'start'], function (BotMan $bot) {
            $bot->reply('👋 Привет! Бот для уведомлений ТП запущен | ustoyob.tj');
        });

        $botman->hears(['/id', 'id'], function (BotMan $bot) {
            $bot->reply("🆔 ID чата: {$bot->getUser()->getId()}");
        });

        $botman->fallback(function (BotMan $bot) {
            $bot->reply('Попробуй: /start, /id');
        });

        $botman->listen();

        return new Response('OK', Response::HTTP_OK);
    }
}
