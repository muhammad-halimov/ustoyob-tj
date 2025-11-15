<?php

namespace App\Repository\User;

use App\Entity\Appeal\Appeal;
use App\Entity\Ticket\Ticket;
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

    public function findTicketComplaintsById(bool $ticketStatus, Ticket $ticket, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.ticket = :ticket")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('ticket', $ticket)
            ->getQuery()
            ->getResult();
    }

    public function findUserComplaintsById(bool $ticketStatus, User $user, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.respondent = :user")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findTechSupportsByAdmin(bool $ticketStatus, User $user, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.administrant = :user")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findTechSupportsByClient(bool $ticketStatus, User $user, string $type): ?array
    {
        return $this
            ->createQueryBuilder('a')
            ->where("a.type = :type")
            ->andWhere("a.ticketAppeal = :status")
            ->andWhere("a.author = :user")
            ->setParameter('type', $type)
            ->setParameter('status', $ticketStatus)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
