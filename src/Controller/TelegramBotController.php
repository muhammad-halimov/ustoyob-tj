<?php

namespace App\Controller;

use Exception;
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
        try {
            // Логирование для отладки
            file_put_contents('/tmp/telegram_debug.log',
                date('Y-m-d H:i:s') . " Webhook called\n",
                FILE_APPEND
            );

            $config = [
                "telegram" => [
                    "token" => $_ENV['TELEGRAM_BOT_TOKEN']
                ]
            ];

            DriverManager::loadDriver(TelegramDriver::class);
            $botman = BotManFactory::create($config);

            $botman->hears('/^\/?(?:start|старт)$/i', function (BotMan $bot) {
                $bot->reply('👋 Привет! Напиши hello.');
            });

            $botman->hears('/^(?:hello|привет)$/i', function (BotMan $bot) {
                $bot->reply('Hello yourself! 🎉');
            });

            $botman->fallback(function (BotMan $bot) {
                $bot->reply('Не понял команду. Попробуй: /start или hello');
            });

            $botman->listen();

            return new Response('OK', Response::HTTP_OK);

        } catch (Exception $e) {
            // Логируем ошибку
            file_put_contents('/tmp/telegram_debug.log',
                date('Y-m-d H:i:s') . " ERROR: " . $e->getMessage() . "\n",
                FILE_APPEND
            );

            return new Response('ERROR', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
