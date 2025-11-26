<?php

namespace App\Repository\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TechSupport>
 */
class TechSupportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TechSupport::class);
    }


    public function findTechSupportsByAdmin(User $user): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->andWhere("a.administrant = :user")
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findTechSupportsByUser(User $user): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->andWhere("a.author = :user")
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
