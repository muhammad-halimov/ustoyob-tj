<?php

namespace App\Repository\Chat;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Chat>
 */
class ChatRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Chat::class);
    }

    /**
     * Все чаты, где юзер является инициатором ИЛИ реципиентом.
     *
     * @param string|null $ticketId     фильтр по UUID тикета (null — без фильтра)
     * @param bool|null   $active       фильтр по полю active (null — без фильтра)
     * @param string|null $counterpartId фильтр по UUID собеседника (null — без фильтра) —
     *                                   чаты именно с этим конкретным пользователем (в любую
     *                                   сторону: он author или replyAuthor), общий и тикет-скоуп
     *                                   чаты разом. Нужен фронту, чтобы перед откликом на тикет
     *                                   проверить, нет ли уже переписки с этим человеком, не
     *                                   вытягивая весь список чатов.
     */
    public function findUserChats(User $user, ?string $ticketId = null, ?bool $active = null, ?string $counterpartId = null): QueryBuilder
    {
        $qb = $this
            ->createQueryBuilder('c')
            // Сортировка по последней активности (новые сверху) — раньше это
            // считал фронт сам, беря последний элемент Chat.messages (поле
            // убрали, см. Chat::$messages) — теперь считаем на бэке. LEFT JOIN
            // + MAX(...), а не коррелированный подзапрос внутри COALESCE —
            // DQL не разрешает подзапрос аргументом COALESCE ("Expected
            // Literal, got SELECT"), а через агрегат по JOIN — стандартно.
            // COALESCE на случай чата совсем без сообщений (только что
            // создан) — тогда сортируем по времени создания самого чата.
            ->leftJoin(ChatMessage::class, 'm', 'WITH', 'm.chat = c')
            ->addSelect('COALESCE(MAX(m.createdAt), c.createdAt) AS HIDDEN lastActivity')
            ->groupBy('c.id')
            ->where('c.author = :user OR c.replyAuthor = :user')
            // "Удалить чат для меня" (см. Chat::$hiddenByAuthor/$hiddenByReplyAuthor,
            // ApiDeleteChatController) — не показываем в /chats/me чат, который
            // ИМЕННО ЭТОТ пользователь скрыл для себя, независимо от того, видит
            // ли его вторая сторона. GET /chats/{id} по прямому ID не трогаем —
            // "скрыть для себя" убирает только из списка, не запрещает открыть.
            //
            // Это не QueryCollectionExtensionInterface (как ApprovedTicketExtension
            // для тикетов), потому что /chats/me — кастомный контроллер
            // (ApiGetMyChatsController), обращается сюда напрямую и не проходит
            // через пайплайн API Platform, где extensions вообще участвуют
            // (тот же случай, что и с /tickets/me — см. докблок ApprovedTicketExtension).
            ->andWhere('NOT (c.author = :user AND c.hiddenByAuthor = true) AND NOT (c.replyAuthor = :user AND c.hiddenByReplyAuthor = true)')
            ->setParameter('user', $user)
            ->orderBy('lastActivity', 'DESC');

        if ($ticketId !== null) {
            $qb->andWhere('IDENTITY(c.ticket) = :ticketId')
               ->setParameter('ticketId', $ticketId);
        }

        if ($active !== null) {
            $qb->andWhere('c.active = :active')
               ->setParameter('active', $active);
        }

        if ($counterpartId !== null) {
            $qb->andWhere('IDENTITY(c.author) = :counterpartId OR IDENTITY(c.replyAuthor) = :counterpartId')
               ->setParameter('counterpartId', $counterpartId);
        }

        return $qb;
    }

    /**
     * Чаты строго между $author и $replyAuthor (по−0стированный порядок).
     * В отличие от findChatBetweenUsers() не проверяет обратный порядок.
     */
    public function findChatsByAuthors(?User $author, ?User $replyAuthor): array|null
    {
        return $this
            ->createQueryBuilder('c')
            ->where('c.author = :author AND c.replyAuthor = :replyAuthor')
            ->setParameter('author', $author)
            ->setParameter('replyAuthor', $replyAuthor)
            ->getQuery()
            ->getResult();
    }

    /**
     * Ищет чат между двумя пользователями в любом направлении.
     *
     * Проверяет два источника:
     *   1. Прямая связь Chat.author / Chat.replyAuthor (запрос без тикета)
     *   2. Через Ticket: ticket.author и ticket.master
     *      (мастер откликается на тикет клиента — связь идёт через Ticket,
     *       а не напрямую в Chat)
     *
     * Используется для проверки наличия взаимодействия перед оставлением отзыва.
     *
     * @param bool $array тру — вернуть массив, фалс — первый найденный Chat|null
     */
    public function findChatBetweenUsers(?User $user1, ?User $user2, bool $array = false): Chat|array|null
    {
        $query = $this->createQueryBuilder('c')
            ->leftJoin('c.ticket', 't')
            ->where(
                // Проверяем прямые связи в Chat
                '(c.author = :user1 AND c.replyAuthor = :user2) OR ' .
                '(c.author = :user2 AND c.replyAuthor = :user1) OR ' .
                // Или через Ticket
                '(t.author = :user1 AND t.master = :user2) OR ' .
                '(t.author = :user2 AND t.master = :user1)'
            )
            ->setParameter('user1', $user1)
            ->setParameter('user2', $user2)
            ->setMaxResults(1)
            ->getQuery();

        return $array ? $query->getResult() : $query->getOneOrNullResult();
    }
}
