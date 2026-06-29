<?php

namespace App\Repository\Ticket;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
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

    public function findTicketsByUserRole(User $user): ?QueryBuilder
    {
        if (in_array('ROLE_CLIENT', $user->getRoles())) {
            return $this
                ->createQueryBuilder('t')
                ->innerJoin('t.author', 'author')
                ->where('t.author = :authorId')
                ->andWhere("t.service = :status")
                ->andWhere("CAST(author.roles AS text) LIKE :role")
                ->setParameter('authorId', $user->getId())
                ->setParameter('status', false)
                ->setParameter('role', '%ROLE_CLIENT%');
        }

        if (in_array('ROLE_MASTER', $user->getRoles())) {
            return $this
                ->createQueryBuilder('t')
                ->innerJoin('t.master', 'master')
                ->where('t.master = :masterId')
                ->andWhere("t.service = :status")
                ->andWhere("CAST(master.roles AS text) LIKE :role")
                ->setParameter('masterId', $user->getId())
                ->setParameter('status', true)
                ->setParameter('role', '%ROLE_MASTER%');
        }

        return null;
    }

    /**
     * Возвращает тикет по ID с учётом правил видимости:
     *   - approved=true  → виден всем
     *   - approved=false → виден только автору (по userId)
     *   - null           → тикет не существует или доступ запрещён → 404
     */
    public function findVisibleById(int $id, ?int $userId = null): ?Ticket
    {
        $qb = $this->createQueryBuilder('t')
            ->where('t.id = :id')
            ->setParameter('id', $id);

        if ($userId !== null) {
            $qb->andWhere('t.approved = true OR t.author = :userId')
               ->setParameter('userId', $userId);
        } else {
            $qb->andWhere('t.approved = true');
        }

        return $qb->getQuery()->getOneOrNullResult();
    }
}
