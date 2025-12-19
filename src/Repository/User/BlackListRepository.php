<?php

namespace App\Repository\User;

use App\Entity\Extra\BlackList;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BlackList>
 */
class BlackListRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BlackList::class);
    }

    public function findBlackLists(User $user): array
    {
        return $this
            ->createQueryBuilder('b')
            ->where('b.author = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
