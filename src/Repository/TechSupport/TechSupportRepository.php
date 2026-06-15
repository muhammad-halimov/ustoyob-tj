<?php

namespace App\Repository\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TechSupport>
 */
class TechSupportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TechSupport::class);
    }


    /**
     * Тикеты, назначенные на конкретного администратора.
     * Используется в GET /tech-supports/admin/{id} — администратор видит чужие тикеты по ID.
     */
    public function findTechSupportsByAdmin(User $user): QueryBuilder
    {
        return $this
            ->createQueryBuilder('a')
            ->andWhere("a.administrant = :user")
            ->setParameter('user', $user)
            ->orderBy('a.createdAt', 'DESC');
    }

    /**
     * Тикеты, созданные конкретным пользователем.
     * Используется в GET /tech-supports/user/{id} — администратор видит тикеты юзера по его ID.
     */
    public function findTechSupportsByUser(User $user): QueryBuilder
    {
        return $this
            ->createQueryBuilder('a')
            ->andWhere("a.author = :user")
            ->setParameter('user', $user)
            ->orderBy('a.createdAt', 'DESC');
    }

    /**
     * Все тикеты где пользователь — автор ИЛИ администрант.
     * Раньше был баг: если у юзера есть хоть один тикет как автор,
     * тикеты где он администрант не возвращались. Теперь возвращаются оба случая одним запросом.
     * Используется в GET /tech-supports/me.
     */
    public function findTechSupportsByUserOrAdmin(User $user): QueryBuilder
    {
        return $this
            ->createQueryBuilder('a')
            ->andWhere('a.author = :user OR a.administrant = :user')
            ->setParameter('user', $user)
            ->orderBy('a.createdAt', 'DESC');
    }

    /**
     * Все тикеты в системе — только для администраторов.
     * Опциональный параметр $status позволяет фильтровать по статусу,
     * например: findAllTechSupports('new') — только новые тикеты.
     * Используется в GET /tech-supports.
     */
    public function findAllTechSupports(?string $status = null): QueryBuilder
    {
        $qb = $this->createQueryBuilder('a')->orderBy('a.createdAt', 'DESC');

        if ($status !== null) {
            $qb->andWhere('a.status = :status')->setParameter('status', $status);
        }

        return $qb;
    }
}
