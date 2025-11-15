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

    public function findUserChatsById(User $user): array
    {
        return $this
            ->createQueryBuilder('c')
            ->where('c.author = :userId')
            ->orWhere('c.replyAuthor = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }
}
