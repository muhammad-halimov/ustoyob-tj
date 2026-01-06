<?php

namespace App\Repository\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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

    public function findUserChats(User $user): array
    {
        return $this
            ->createQueryBuilder('c')
            ->where('c.author = :user OR c.replyAuthor = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

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
