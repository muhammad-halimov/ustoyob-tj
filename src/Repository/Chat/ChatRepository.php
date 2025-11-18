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

    public function findChatsByAuthors(User $author, User $replyAuthor): array
    {
        return $this
            ->createQueryBuilder('c')
            ->where('c.author = :author AND c.replyAuthor = :replyAuthor')
            ->setParameter('author', $author)
            ->setParameter('replyAuthor', $replyAuthor)
            ->getQuery()
            ->getResult();
    }
}
