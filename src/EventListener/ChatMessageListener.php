<?php

namespace App\EventListener;

use App\Entity\Chat\ChatMessage;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * MERCURE — что это такое (простыми словами):
 *
 * Обычно браузер сам инициирует запрос к серверу ("дай мне данные?").
 * SSE (Server-Sent Events) переворачивает это с ног на голову:
 * браузер один раз открывает соединение, и дальше сервер сам ТОЛКАЕТ
 * обновления в браузер в реальном времени — без повторных запросов.
 *
 * Mercure — это специальный HTTP-сервер (запускается в Docker), который
 * умеет держать тысячи таких открытых соединений. Symfony публикует
 * в него сообщение → Mercure мгновенно доставляет его всем подписанным
 * браузерам.
 *
 * Этот класс — слушатель Doctrine. Как только в БД создаётся, меняется
 * или удаляется ChatMessage, Symfony автоматически вызывает методы здесь,
 * и мы публикуем событие в Mercure. Фронтенд получает его мгновенно.
 *
 * Топик — это просто уникальный ключ канала. Формат: "chat:{chatId}".
 * Каждый чат имеет свой топик. Браузер подписывается только на нужный.
 *
 * private: true означает, что без подписного JWT-токена никто чужой
 * подписаться на этот топик не сможет (см. GetChatSubscribeTokenController).
 */

#[AsEntityListener(event: Events::postPersist, entity: ChatMessage::class)]
#[AsEntityListener(event: Events::postUpdate, entity: ChatMessage::class)]
#[AsEntityListener(event: Events::preRemove, entity: ChatMessage::class)]
#[AsEntityListener(event: Events::postRemove, entity: ChatMessage::class)]
class ChatMessageListener
{
    /**
     * Хранит данные сообщения ДО удаления из БД.
     * После удаления entity уже не имеет ID, поэтому мы запоминаем
     * нужное в preRemove и используем в postRemove.
     */
    private ?array $removedData = null;

    public function __construct(
        private readonly HubInterface        $hub,        // Клиент Mercure-хаба
        private readonly SerializerInterface $serializer, // Для сериализации сущности в JSON
    ) {}

    /** Вызывается после сохранения нового сообщения в БД
     * @throws ExceptionInterface
     */
    public function postPersist(ChatMessage $message): void
    {
        $this->publish('created', $message);
    }

    /** Вызывается после обновления сообщения в БД
     * @throws ExceptionInterface
     */
    public function postUpdate(ChatMessage $message): void
    {
        $this->publish('updated', $message);
    }

    /**
     * Вызывается ДО удаления — запоминаем id и chatId,
     * потому что после удаления entity они уже недоступны.
     */
    public function preRemove(ChatMessage $message): void
    {
        $this->removedData = [
            'id'     => $message->getId(),
            'chatId' => $message->getChat()?->getId(),
        ];
    }

    /** Вызывается ПОСЛЕ удаления — публикуем событие с сохранёнными данными */
    public function postRemove(): void
    {
        if (!$this->removedData) return;

        $chatId = $this->removedData['chatId'];
        if (!$chatId) return;

        $this->hub->publish(new Update(
            topics: $this->topic($chatId),
            data: json_encode([
                'type' => 'deleted',
                'data' => $this->removedData,
            ]),
            private: true, // Только авторизованные подписчики получат это событие
        ));

        $this->removedData = null;
    }

    // -------------------------------------------------------------------------

    /**
     * Универсальный метод публикации: сериализует сообщение в JSON
     * по группе chatMessages:read и отправляет в Mercure-хаб.
     *
     * Структура события на фронтенде:
     * { "type": "created"|"updated"|"deleted", "data": { ...ChatMessage... } }
     * @throws ExceptionInterface
     */
    private function publish(string $type, ChatMessage $message): void
    {
        $chatId = $message->getChat()?->getId();
        if (!$chatId) return;

        // Сериализуем сущность теми же группами, что возвращает GET-эндпоинт
        $data = $this->serializer->serialize($message, 'json', [
            'groups'           => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);

        $this->hub->publish(new Update(
            topics: $this->topic($chatId),
            data: json_encode([
                'type' => $type,
                'data' => json_decode($data, true),
            ]),
            private: true, // Только авторизованные подписчики получат это событие
        ));
    }

    /**
     * Формат топика: "chat:42" — уникален для каждого чата.
     * Именно на этот string подписывается браузер через EventSource.
     */
    private function topic(int $chatId): string
    {
        return "chat:{$chatId}";
    }
}
