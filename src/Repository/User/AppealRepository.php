<?php

namespace App\Repository\User;

use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Appeal\Types\AppealTicket;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
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

    /**
     * Возвращает избранное владельца с пагинацией.
     * $type опционально фильтрует по типу записи ('user' | 'ticket').
     */
    public function findByAuthor(User $author): QueryBuilder
    {
        return $this
            ->createQueryBuilder('appeal')
            ->where('appeal.author = :author')
            ->setParameter('author', $author);
    }

    public function findTicketComplaints(Ticket $ticket): ?array
    {
        return $this->getEntityManager()
            ->createQueryBuilder()
            ->select('a')
            ->from(AppealTicket::class, 'a')
            ->andWhere('a.ticket = :ticket')
            ->setParameter('ticket', $ticket)
            ->getQuery()
            ->getResult();
    }
}
