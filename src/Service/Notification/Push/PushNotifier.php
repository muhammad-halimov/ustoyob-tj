<?php

namespace App\Service\Notification\Push;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use App\Repository\User\DeviceTokenRepository;
use App\Repository\User\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Throwable;

/**
 * Push-уведомления в мобильное приложение и в браузер (сайт): новое сообщение
 * в чате, новый отклик на объявление (Chat с тикетом) и новое сообщение в
 * обращении в техподдержку.
 *
 * Уведомления копятся за запрос и уходят на kernel.terminate — уже ПОСЛЕ
 * того, как ответ отдан клиенту (fastcgi_finish_request): отправка в FCM
 * не задерживает ни отправку сообщения, ни создание чата.
 *
 * Текст — на языке приложения устройства (DeviceToken::$locale, по
 * умолчанию tj). Не настроен Firebase (FcmClient::isConfigured()) — ничего
 * не делает.
 */
class PushNotifier implements EventSubscriberInterface
{
    private const array TEXTS = [
        'photo'         => ['tj' => '📷 Акс',     'ru' => '📷 Фото',       'eng' => '📷 Photo'],
        'responseTitle' => ['tj' => 'Ҷавоби нав', 'ru' => 'Новый отклик', 'eng' => 'New response'],
        'responseBody'  => ['tj' => '%s ба «%s» ҷавоб дод', 'ru' => '%s откликнулся на «%s»', 'eng' => '%s responded to “%s”'],
        'supportTitle'  => ['tj' => 'Дастгирии техникӣ: %s', 'ru' => 'Техподдержка: %s', 'eng' => 'Support: %s'],
        'newTicket'     => ['tj' => 'Муроҷиати нав ба дастгирии техникӣ', 'ru' => 'Новое обращение в техподдержку', 'eng' => 'New support ticket'],
        'assigned'      => ['tj' => 'Муроҷиат ба шумо супорида шуд', 'ru' => 'Вам назначено обращение', 'eng' => 'A support ticket was assigned to you'],
    ];

    /** @var list<array{user: User, texts: callable(string): array{0: string, 1: string}, data: array<string, string>, group: string, path: string}> */
    private array $queue = [];

    public function __construct(
        private readonly FcmClient              $fcm,
        private readonly DeviceTokenRepository  $deviceTokenRepository,
        private readonly UserRepository         $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface        $logger,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::TERMINATE  => 'flush',
            ConsoleEvents::TERMINATE => 'flush',
        ];
    }

    /** Новое сообщение — собеседнику автора. Сообщение без текста и без фото не шлём (фото к нему ещё грузятся). */
    public function chatMessage(ChatMessage $message): void
    {
        $chat   = $message->getChat();
        $author = $message->getAuthor();
        if (!$chat || !$author) return;

        $recipient = $chat->getAuthor() === $author ? $chat->getReplyAuthor() : $chat->getAuthor();
        if (!$recipient || $recipient === $author) return;

        $text = trim((string) $message->getDescription());
        if ($text === '' && $message->getImages()->isEmpty()) return;

        $title = $this->fullName($author);
        $body  = $text !== '' ? $this->cut($text, 180) : null;

        $this->queue[] = [
            'user'  => $recipient,
            'texts' => fn(string $locale) => [$title, $body ?? $this->text('photo', $locale)],
            'data'  => ['type' => 'chat_message', 'chatId' => (string) $chat->getId()],
            'group' => 'chat-' . $chat->getId(),
            'path'  => '/chats?chatId=' . $chat->getId(),
        ];
    }

    /** Новый отклик: чат по объявлению создан — владельцу объявления (replyAuthor, см. ApiPostChatController). */
    public function chatResponse(Chat $chat): void
    {
        $ticket    = $chat->getTicket();
        $author    = $chat->getAuthor();
        $recipient = $chat->getReplyAuthor();
        if (!$ticket || !$author || !$recipient || $recipient === $author) return;

        $name  = $this->fullName($author);
        $title = $this->cut((string) $ticket->getTitle(), 80);

        $this->queue[] = [
            'user'  => $recipient,
            'texts' => fn(string $locale) => [$this->text('responseTitle', $locale), sprintf($this->text('responseBody', $locale), $name, $title)],
            'data'  => ['type' => 'chat_response', 'chatId' => (string) $chat->getId()],
            'group' => 'chat-' . $chat->getId(),
            'path'  => '/chats?chatId=' . $chat->getId(),
        ];
    }

    /**
     * Новое сообщение в обращении в техподдержку.
     *  - Пишет автор обращения → исполнителю (administrant); не назначен — всем администраторам.
     *  - Отвечает поддержка (администратор; в т.ч. сообщение из админ-панели без автора) → автору обращения.
     * Гостевое обращение (без аккаунта) — автору слать некуда. Сообщение без текста и без фото не шлём (фото
     * к нему ещё грузятся — push уйдёт из ApiPostUniversalImageController).
     */
    public function techSupportMessage(TechSupportMessage $message): void
    {
        $ticket = $message->getTechSupport();
        if (!$ticket) return;

        $text = trim((string) $message->getDescription());
        if ($text === '' && $message->getImages()->isEmpty()) return;

        $author       = $message->getAuthor();
        $ticketAuthor = $ticket->getAuthor();
        $recipients   = $author !== null && $author === $ticketAuthor
            ? $this->ticketAdmins($ticket)
            : ($ticketAuthor ? [$ticketAuthor] : []);

        $ticketTitle = $this->cut((string) $ticket->getTitle(), 60);
        $body        = $text !== '' ? $this->cut($text, 180) : null;

        foreach ($recipients as $recipient) {
            if ($recipient === $author) continue;
            $this->queueSupport($recipient, $ticket, fn(string $locale) => [
                sprintf($this->text('supportTitle', $locale), $ticketTitle),
                $body ?? $this->text('photo', $locale),
            ]);
        }
    }

    /** Новое обращение — исполнителю (назначается автоматически, см. TechSupportListener); нет — всем админам. */
    public function techSupportCreated(TechSupport $ticket): void
    {
        $title = $this->cut((string) $ticket->getTitle(), 120);
        foreach ($this->ticketAdmins($ticket) as $admin) {
            $this->queueSupport($admin, $ticket, fn(string $locale) => [$this->text('newTicket', $locale), $title]);
        }
    }

    /** Обращение переназначено — новому исполнителю. */
    public function techSupportAssigned(TechSupport $ticket, User $admin): void
    {
        $title = $this->cut((string) $ticket->getTitle(), 120);
        $this->queueSupport($admin, $ticket, fn(string $locale) => [$this->text('assigned', $locale), $title]);
    }

    /** @return list<User> исполнитель обращения или, если его нет, все администраторы */
    private function ticketAdmins(TechSupport $ticket): array
    {
        $admin = $ticket->getAdministrant();

        return $admin ? [$admin] : array_values($this->userRepository->findAllAdmins());
    }

    /** @param callable(string): array{0: string, 1: string} $texts */
    private function queueSupport(User $recipient, TechSupport $ticket, callable $texts): void
    {
        $this->queue[] = [
            'user'  => $recipient,
            'texts' => $texts,
            'data'  => ['type' => 'tech_support_message', 'ticketId' => (string) $ticket->getId()],
            'group' => 'support-' . $ticket->getId(),
            'path'  => '/support?ticket=' . $ticket->getId(),
        ];
    }

    public function flush(): void
    {
        $queue = $this->queue;
        $this->queue = [];
        if (!$queue || !$this->fcm->isConfigured()) return;

        try {
            $sent = [];
            foreach ($queue as $item) {
                foreach ($this->deviceTokenRepository->findBy(['user' => $item['user']]) as $device) {
                    [$title, $body] = ($item['texts'])($device->getLocale() ?? 'tj');
                    $sent[] = [$device, $this->fcm->send((string) $device->getToken(), $title, $body, $item['data'], $item['group'], $item['path'])];
                }
            }

            $removed = false;
            foreach ($sent as [$device, $response]) {
                if (!$this->fcm->isDeadToken($response)) continue;
                $this->entityManager->remove($device);
                $removed = true;
            }
            if ($removed) $this->entityManager->flush();
        } catch (Throwable $e) {
            $this->logger->error('Push-уведомления не отправлены', ['exception' => $e]);
        }
    }

    private function text(string $key, string $locale): string
    {
        return self::TEXTS[$key][$locale] ?? self::TEXTS[$key]['tj'];
    }

    private function fullName(User $user): string
    {
        $name = trim(($user->getName() ?? '') . ' ' . ($user->getSurname() ?? ''));

        return $name !== '' ? $name : 'ustoyob.tj';
    }

    private function cut(string $text, int $max): string
    {
        return mb_strlen($text) > $max ? mb_substr($text, 0, $max - 1) . '…' : $text;
    }
}
