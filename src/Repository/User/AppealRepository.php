<?php

namespace App\Repository\User;

use App\Entity\Appeal\Appeal;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Appeal>
 */
class AppealRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Appeal::class);
    }

    public function findAllByTicketStatus(bool $status): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.ticketAppeal = :status")
            ->setParameter('status', $status)
            ->getQuery()
            ->getResult();
    }

    public function findAllByType(string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->setParameter('type', $type)
            ->getQuery()
            ->getResult();
    }
}
