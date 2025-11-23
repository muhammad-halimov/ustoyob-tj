<?php

namespace App\Repository;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Ticket>
 */
class TicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Ticket::class);
    }

    public function findUserTicketsById(User $user): array
    {
        if (in_array('ROLE_CLIENT', $user->getRoles())){
            return $this
                ->createQueryBuilder('t')
                ->innerJoin('t.author', 'author')
                ->where('t.author = :authorId')
                ->andWhere("t.service = :status")
//                ->andWhere("author.roles LIKE :role")
                ->andWhere("CAST(author.roles AS text) LIKE :role")
                ->setParameter('authorId', $user->getId())
                ->setParameter('status', false)
                ->setParameter('role', '%ROLE_CLIENT%')
                ->getQuery()
                ->getResult();
        } else if(in_array('ROLE_MASTER', $user->getRoles())){
            return $this
                ->createQueryBuilder('t')
                ->innerJoin('t.master', 'master')
                ->where('t.master = :masterId')
                ->andWhere("t.service = :status")
//                ->andWhere("master.roles LIKE :role")
                ->andWhere("CAST(master.roles AS text) LIKE :role")
                ->setParameter('masterId', $user->getId())
                ->setParameter('status', true)
                ->setParameter('role', '%ROLE_MASTER%')
                ->getQuery()
                ->getResult();
        }

        return [];
    }

    public function findUserTicketsByClientRole(User $user): array
    {
        return $this
            ->createQueryBuilder('t')
            ->innerJoin('t.author', 'author')
            ->where('t.author = :authorId')
            ->andWhere("t.service = :status")
//            ->andWhere("author.roles LIKE :role")
            ->andWhere("CAST(author.roles AS text) LIKE :role")
            ->setParameter('authorId', $user->getId())
            ->setParameter('status', false)
            ->setParameter('role', '%ROLE_CLIENT%')
            ->getQuery()
            ->getResult();
    }

    public function findUserTicketsByMasterRole(User $user): array
    {
        return $this
            ->createQueryBuilder('t')
            ->innerJoin('t.master', 'master')
            ->where('t.master = :masterId')
            ->andWhere("t.service = :status")
//            ->andWhere("master.roles LIKE :role")
            ->andWhere("CAST(master.roles AS text) LIKE :role")
            ->setParameter('masterId', $user->getId())
            ->setParameter('status', true)
            ->setParameter('role', '%ROLE_MASTER%')
            ->getQuery()
            ->getResult();
    }

    public function findUserTicketsByStatus(bool $status): array
    {
        return $this
            ->createQueryBuilder('t')
            ->where("t.service = :status")
            ->setParameter('status', $status)
            ->getQuery()
            ->getResult();
    }
}
