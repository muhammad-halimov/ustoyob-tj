<?php

namespace App\Repository\Chat;

use App\Entity\Chat\Chat;
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
     * @param int|null  $ticketId фильтр по ID тикета (null — без фильтра)
     * @param bool|null $active   фильтр по полю active (null — без фильтра)
     */
    public function findUserChats(User $user, ?int $ticketId = null, ?bool $active = null): QueryBuilder
    {
        $qb = $this
            ->createQueryBuilder('c')
            ->where('c.author = :user OR c.replyAuthor = :user')
            ->setParameter('user', $user);

        if ($ticketId !== null) {
            $qb->andWhere('IDENTITY(c.ticket) = :ticketId')
               ->setParameter('ticketId', $ticketId);
        }

        if ($active !== null) {
            $qb->andWhere('c.active = :active')
               ->setParameter('active', $active);
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
