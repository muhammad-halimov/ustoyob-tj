<?php

namespace App\Repository\User;

use App\Entity\User\Phone;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Phone>
 */
class PhoneRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Phone::class);
    }

    /**
     * Найти телефон по номеру
     */
    public function findByPhoneNumber(string $phone): ?Phone
    {
        // Нормализуем номер перед поиском
        $cleaned = preg_replace('/[^\d+]/', '', $phone);

        return $this->createQueryBuilder('p')
            ->where('p.phone = :phone')
            ->setParameter('phone', $cleaned)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Найти все телефоны пользователя
     */
    public function findByOwner(int $ownerId): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.owner = :ownerId')
            ->setParameter('ownerId', $ownerId)
            ->orderBy('p.main', 'DESC')
            ->addOrderBy('p.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Найти основной телефон пользователя
     */
    public function findMainPhone(int $ownerId): ?Phone
    {
        return $this->createQueryBuilder('p')
            ->where('p.owner = :ownerId')
            ->andWhere('p.main = true')
            ->setParameter('ownerId', $ownerId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Проверить существование телефона
     */
    public function phoneExists(string $phone, ?int $excludeId = null): bool
    {
        $cleaned = preg_replace('/[^\d+]/', '', $phone);

        $qb = $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.phone = :phone')
            ->setParameter('phone', $cleaned);

        if ($excludeId !== null) {
            $qb->andWhere('p.id != :excludeId')
                ->setParameter('excludeId', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    /**
     * Найти верифицированные телефоны
     */
    public function findVerifiedPhones(int $ownerId): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.owner = :ownerId')
            ->andWhere('p.verified = true')
            ->setParameter('ownerId', $ownerId)
            ->getQuery()
            ->getResult();
    }
}
