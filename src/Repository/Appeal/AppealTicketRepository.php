<?php

namespace App\Repository\Appeal;

use App\Entity\Appeal\AppealTypes\AppealTicket;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AppealTicket>
 */
class AppealTicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppealTicket::class);
    }
}
