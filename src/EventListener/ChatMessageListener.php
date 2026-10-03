<?php

namespace App\EventListener;

use App\Entity\Chat\ChatMessage;
use App\Service\Notification\Push\PushNotifier;
use App\Entity\Extra\EntityRevision;
use App\Entity\User;
use App\Service\Extra\MercurePublisher;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Uid\Uuid;

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
 * Сама сериализация + публикация в хаб вынесены в MercurePublisher —
 * тот же сервис использует TechSupportMessageListener.
 *
 * Топик — это просто уникальный ключ канала. Формат: "chat:{chatId}".
 * Каждый чат имеет свой топик. Браузер подписывается только на нужный.
 *
 * private: true (внутри MercurePublisher) означает, что без подписного
 * JWT-токена никто чужой подписаться на этот топик не сможет
 * (см. ApiGetChatSubscribeTokenController).
 */

#[AsEntityListener(event: Events::postPersist, entity: ChatMessage::class)]
#[AsEntityListener(event: Events::preUpdate, entity: ChatMessage::class)]
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

    /**
     * @var array<int, array{old: ?string, new: ?string}> Сообщения (по spl_object_id) → было/стало,
     * для записи EntityRevision в postUpdate (audit trail, см. TicketListener
     * — тот же приём: changeset доступен только в preUpdate, но персистить
     * новую сущность внутри preUpdate нельзя, только в postUpdate).
     */
    private array $pendingRevision = [];

    public function __construct(
        private readonly MercurePublisher       $publisher,
        private readonly EntityManagerInterface $entityManager,
        private readonly Security               $security,
        private readonly PushNotifier           $pushNotifier,
    ) {}

    /**
     * Редактируется только description (см. ApiPatchChatMessageController) —
     * версионируем только его, фото логируются отдельно (см. syncImages()
     * в AbstractApiHelperController).
     */
    public function preUpdate(ChatMessage $message, PreUpdateEventArgs $event): void
    {
        if ($event->hasChangedField('description')) {
            $this->pendingRevision[spl_object_id($message)] = [
                'old' => $event->getOldValue('description'),
                'new' => $event->getNewValue('description'),
            ];
        }
    }

    /** Вызывается после сохранения нового сообщения в БД */
    public function postPersist(ChatMessage $message): void
    {
        $this->publish('created', $message);
        // Сообщение только с фото уходит пустым, фото — следующим запросом: push по нему шлёт
        // загрузка фото (ApiPostUniversalImageController), здесь PushNotifier такое пропустит.
        $this->pushNotifier->chatMessage($message);
    }

    /** Вызывается после обновления сообщения в БД */
    public function postUpdate(ChatMessage $message): void
    {
        $this->publish('updated', $message);

        $key = spl_object_id($message);
        if (!isset($this->pendingRevision[$key])) return;

        $descriptionDiff = $this->pendingRevision[$key];
        unset($this->pendingRevision[$key]);

        $revision = (new EntityRevision())
            ->setEntityType('chat_message')
            ->setEntityId($message->getId())
            // Родитель — сам Chat (ID диалога), а не его Ticket: сообщение
            // формально вложено в Chat, Ticket — не прямая связь ChatMessage
            // (см. коммент на EntityRevision::$parentId).
            ->setParentId($message->getChat()?->getId())
            ->setEntity('Chat')
            ->setAction(EntityRevision::ACTION_UPDATED)
            ->setSnapshot(['description' => $descriptionDiff])
            ->setActor($this->currentUser());

        // persist+flush здесь безопасны: postUpdate вызывается уже после
        // записи изменений ChatMessage в БД, текущий flush завершён
        // (тот же приём, что в TicketListener).
        $this->entityManager->persist($revision);
        $this->entityManager->flush();
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
        if ($chatId) $this->publisher->publishRaw($this->topic($chatId), 'deleted', $this->removedData);

        $this->removedData = null;
    }

    // -------------------------------------------------------------------------

    /**
     * Сериализует сообщение группой chatMessages:read и отправляет в
     * Mercure-хаб через общий MercurePublisher.
     *
     * Структура события на фронтенде:
     * { "type": "created"|"updated"|"deleted", "data": { ...ChatMessage... } }
     */
    private function publish(string $type, ChatMessage $message): void
    {
        $chatId = $message->getChat()?->getId();
        if (!$chatId) return;

        $this->publisher->publish($this->topic($chatId), $type, $message, ['chatMessages:read']);
    }

    /**
     * Формат топика: "chat:<uuid>" — уникален для каждого чата.
     * Именно на этот string подписывается браузер через EventSource.
     */
    private function topic(Uuid $chatId): string
    {
        return "chat:{$chatId}";
    }

    private function currentUser(): ?User
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        return $user;
    }
}
