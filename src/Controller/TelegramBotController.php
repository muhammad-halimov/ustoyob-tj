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

        // Принимает: /start, start, /старт, старт (любой регистр)
        $botman->hears('/^\/?(?:start|старт)$/i', function (BotMan $bot) {
            $bot->reply('👋 Привет! Напиши hello.');
        });

        // Принимает: hello, привет, Hello, ПРИВЕТ
        $botman->hears('/^(?:hello|привет)$/i', function (BotMan $bot) {
            $bot->reply('Hello yourself! 🎉');
        });

        // Fallback для всех остальных сообщений
        $botman->fallback(function (BotMan $bot) {
            $bot->reply('Не понял команду 🤔 Попробуй: /start или hello');
        });

        $botman->listen();

        return new Response('OK', Response::HTTP_OK);
    }
}
