<?php

namespace App\Repository\User;

use App\Entity\Appeal\Appeal;
use App\Entity\Ticket\Ticket;
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

    public function findTicketComplaints(Ticket $ticket): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->innerJoin('a.appealTicket', 'at')
            ->andWhere('at.ticket = :ticket')
            ->setParameter('ticket', $ticket)
            ->getQuery()
            ->getResult();
    }
}
