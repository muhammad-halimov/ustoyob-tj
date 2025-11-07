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
                ->innerJoin('r.reviewer', 'rev')
                ->where('r.reviewer = :reviewerId')
                ->andWhere("r.forReviewer = :status")
                ->andWhere("rev.roles LIKE :role")
                ->setParameter('reviewerId', $user->getId())
                ->setParameter('status', false)
                ->setParameter('role', '%ROLE_CLIENT%')
                ->getQuery()
                ->getResult();
        } else if(in_array('ROLE_MASTER', $user->getRoles())){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.user', 'master')
                ->where('r.user = :userId')
                ->andWhere("r.forReviewer = :status")
                ->andWhere("master.roles LIKE :role")
                ->setParameter('userId', $user->getId())
                ->setParameter('status', true)
                ->setParameter('role', '%ROLE_MASTER%')
                ->getQuery()
                ->getResult();
        }

        return [];
    }

    public function findUserReviewsByClientRole(User $user): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.reviewer', 'rev')
            ->where('r.reviewer = :reviewerId')
            ->andWhere("r.forReviewer = :status")
            ->andWhere("rev.roles LIKE :role")
            ->setParameter('reviewerId', $user->getId())
            ->setParameter('status', false)
            ->setParameter('role', '%ROLE_CLIENT%')
            ->getQuery()
            ->getResult();
    }

    public function findUserReviewsByMasterRole(User $user): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.user', 'master')
            ->where('r.user = :userId')
            ->andWhere("r.forReviewer = :status")
            ->andWhere("master.roles LIKE :role")
            ->setParameter('userId', $user->getId())
            ->setParameter('status', true)
            ->setParameter('role', '%ROLE_MASTER%')
            ->getQuery()
            ->getResult();
    }
}
