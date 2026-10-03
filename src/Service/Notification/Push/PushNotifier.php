<?php

namespace App\Service\Notification\Push;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\User\DeviceTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Throwable;

/**
 * Push-уведомления в мобильное приложение: новое сообщение в чате и новый
 * отклик на объявление (Chat с тикетом).
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
    ];

    /** @var list<array{user: User, texts: callable(string): array{0: string, 1: string}, data: array<string, string>, group: string}> */
    private array $queue = [];

    public function __construct(
        private readonly FcmClient              $fcm,
        private readonly DeviceTokenRepository  $deviceTokenRepository,
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
                    $sent[] = [$device, $this->fcm->send((string) $device->getToken(), $title, $body, $item['data'], $item['group'])];
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
