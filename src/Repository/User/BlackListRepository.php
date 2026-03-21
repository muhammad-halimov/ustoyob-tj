<?php

namespace App\Repository\User;

use App\Entity\Extra\BlackList;
use App\Entity\Ticket\Ticket;
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

    public function findByOwner(User $owner, int $page = 1, int $limit = 25, ?string $type = null): array
    {
        $qb = $this->createQueryBuilder('b')
            ->where('b.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('b.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        if ($type !== null) {
            $qb->andWhere('b.type = :type')->setParameter('type', $type);
        }

        return $qb->getQuery()->getResult();
    }

    public function countByOwner(User $owner): int
    {
        return (int) $this->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.owner = :owner')
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function findDuplicate(User $owner, ?User $targetUser = null, ?Ticket $targetTicket = null): ?BlackList
    {
        $qb = $this->createQueryBuilder('b')
            ->where('b.owner = :owner')
            ->setParameter('owner', $owner);

        if ($targetUser !== null) {
            $qb->andWhere('b.user = :targetUser')->setParameter('targetUser', $targetUser);
        }

        if ($targetTicket !== null) {
            $qb->andWhere('b.ticket = :targetTicket')->setParameter('targetTicket', $targetTicket);
        }

        return $qb->getQuery()->getOneOrNullResult();
    }
}
