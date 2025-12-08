<?php

namespace App\Repository\User;

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

    public function findUserFavorites(User $user): array
    {
        return $this
            ->createQueryBuilder('f')
            ->where('f.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
