<?php

namespace App\Repository\User;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
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

    public function findAppealsByStatusAndType(bool $ticketStatus, User $user, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.author = :user OR a.respondent = :user OR a.administrant = :user")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findTechSupportsByUser(bool $ticketStatus, User $user, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.administrant = :user OR a.author = :user")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
