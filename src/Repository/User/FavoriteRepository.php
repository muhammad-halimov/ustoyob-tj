<?php

namespace App\Repository\User;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Favorite;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Favorite>
 */
class FavoriteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Favorite::class);
    }

    /**
     * Возвращает избранное владельца с пагинацией.
     * $type опционально фильтрует по типу записи ('user' | 'ticket').
     */
    public function findByOwner(User $owner, int $page = 1, int $limit = 25, ?string $type = null): array
    {
        $qb = $this->createQueryBuilder('f')
            ->where('f.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('f.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit) // оффсет для пагинации
            ->setMaxResults($limit);

        if ($type !== null) {
            $qb->andWhere('f.type = :type')->setParameter('type', $type);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Количество записей в избранном владельца (для пагинации вне DQL).
     */
    public function countByOwner(User $owner): int
    {
        return (int) $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.owner = :owner')
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Проверяет, есть ли уже такая запись в избранном.
     * Условия строятся динамически в зависимости от переданных аргументов:
     *   - $targetUser != null — ищем по пользователю
     *   - $targetTicket != null — ищем по тикету
     *   - Оба сразу — ищем по обоим (AND)
     */
    public function findDuplicate(User $owner, ?User $targetUser = null, ?Ticket $targetTicket = null): ?Favorite
    {
        $qb = $this->createQueryBuilder('f')
            ->where('f.owner = :owner')
            ->setParameter('owner', $owner);

        if ($targetUser !== null) {
            $qb->andWhere('f.user = :targetUser')->setParameter('targetUser', $targetUser);
        }

        if ($targetTicket !== null) {
            $qb->andWhere('f.ticket = :targetTicket')->setParameter('targetTicket', $targetTicket);
        }

        return $qb->getQuery()->getOneOrNullResult();
    }
}
