<?php

namespace App\EventListener;

use App\Entity\Chat\Chat;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;

/**
 * Автоматически увеличивает счётчик откликов (responsesCount) на тикете
 * каждый раз, когда к нему привязывается новый Chat (т.е. мастер откликается).
 *
 * Почему postPersist, а не postUpdate?
 *   Счётчик нужно увеличивать только при СОЗДАНИИ чата.
 *   Изменение существующего чата (смена статуса, обновление полей) не
 *   означает нового отклика, поэтому postUpdate намеренно пропущен.
 *
 * Почему Chat, а не ChatMessage?
 *   Chat — это сам отклик/сессия между мастером и клиентом по тикету.
 *   ChatMessage — это отдельные сообщения внутри этого чата.
 *   Нас интересует именно факт нового отклика, а не каждое сообщение.
 */
#[AsEntityListener(event: Events::postPersist, entity: Chat::class)]
readonly class ChatResponseListener
{
    public function __construct(private EntityManagerInterface $em) {}

    public function postPersist(Chat $chat): void
    {
        // null — это обычный приватный чат между пользователями без тикета;
        // такие чаты не влияют на счётчик откликов
        $ticket = $chat->getTicket();

        if ($ticket === null) return;

        $ticket->incrementResponsesCount();

        // flush без persist: Ticket уже отслеживается Unit of Work,
        // поэтому достаточно только сохранить изменения
        $this->em->flush();
    }
}
