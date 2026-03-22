<?php

namespace App\Repository\User;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\BlackList;
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

    /**
     * Возвращает чёрный список владельца с пагинацией.
     * $type опционально фильтрует по типу записи ('user' | 'ticket').
     */
    public function findByOwner(User $owner, int $page = 1, int $limit = 25, ?string $type = null): array
    {
        $qb = $this->createQueryBuilder('b')
            ->where('b.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('b.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit) // оффсет для пагинации
            ->setMaxResults($limit);

        if ($type !== null) {
            $qb->andWhere('b.type = :type')->setParameter('type', $type);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Количество записей в чёрном списке владельца (для пагинации вне DQL).
     */
    public function countByOwner(User $owner): int
    {
        return (int) $this->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.owner = :owner')
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Проверяет, есть ли уже такая запись в чёрном списке.
     * Условия строятся динамически в зависимости от переданных аргументов:
     *   - $targetUser != null — ищем по пользователю
     *   - $targetTicket != null — ищем по тикету
     *   - Оба сразу — ищем по обоим условиям (AND)
     */
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
