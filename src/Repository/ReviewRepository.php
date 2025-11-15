<?php

namespace App\Repository;

use App\Entity\Review\Review;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Review>
 */
class ReviewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Review::class);
    }

    public function findUserReviewsById(User $user): array
    {
        if (in_array('ROLE_CLIENT', $user->getRoles())){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.client', 'rev')
                ->where('r.client = :clientId')
                ->andWhere("r.forClient = :status")
                ->andWhere("rev.roles LIKE :role")
                ->setParameter('clientId', $user->getId())
                ->setParameter('status', false)
                ->setParameter('role', '%ROLE_CLIENT%')
                ->getQuery()
                ->getResult();
        } else if(in_array('ROLE_MASTER', $user->getRoles())){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.master', 'master')
                ->where('r.master = :masterId')
                ->andWhere("r.forClient = :status")
                ->andWhere("master.roles LIKE :role")
                ->setParameter('masterId', $user->getId())
                ->setParameter('status', true)
                ->setParameter('role', '%ROLE_MASTER%')
                ->getQuery()
                ->getResult();
        }

        return [];
    }

    public function findClientReviews(User $user): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.client', 'client')
            ->where('r.client = :user')
            ->andWhere("r.forClient = :forClient")
            ->andWhere("client.roles LIKE :role")
            ->setParameter('user', $user)
            ->setParameter('forClient', true)
            ->setParameter('role', '%ROLE_CLIENT%')
            ->getQuery()
            ->getResult();
    }

    public function findMasterReviews(User $user): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.master', 'master')
            ->where('r.master = :user')
            ->andWhere("r.forClient = :forClient")
            ->andWhere("master.roles LIKE :role")
            ->setParameter('user', $user)
            ->setParameter('forClient', false)
            ->setParameter('role', '%ROLE_MASTER%')
            ->getQuery()
            ->getResult();
    }
}
