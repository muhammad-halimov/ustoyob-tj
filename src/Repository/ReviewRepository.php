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

    public function findUserReviews(User $user): array
    {
        if (in_array('ROLE_CLIENT', $user->getRoles())){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.client', 'rev')
                ->where('r.client = :client')
                ->andWhere("r.type = :type")
                ->andWhere("rev.roles LIKE :role")
                ->setParameter('client', $user)
                ->setParameter('type', "master")
                ->setParameter('role', '%ROLE_CLIENT%')
                ->getQuery()
                ->getResult();
        } else if(in_array('ROLE_MASTER', $user->getRoles())){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.master', 'master')
                ->where('r.master = :master')
                ->andWhere("r.type = :type")
                ->andWhere("master.roles LIKE :role")
                ->setParameter('master', $user)
                ->setParameter('type', "client")
                ->setParameter('role', '%ROLE_MASTER%')
                ->getQuery()
                ->getResult();
        }

        return [];
    }

    public function findReviewsByTypeAndRole(User $user, string $type, string $role): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.client', 'client')
            ->innerJoin('r.master', 'master')
            ->where("client.roles LIKE :role OR master.roles LIKE :role")
            ->andWhere('r.client = :user OR r.master = :user')
            ->andWhere("r.type = :type")
            ->setParameter('role', $role)
            ->setParameter('user', $user)
            ->setParameter('type', $type)
            ->getQuery()
            ->getResult();
    }

    public function findReviewsByType(string $type, string $role): array
    {
        return $this
            ->createQueryBuilder('r')
            ->innerJoin('r.client', 'client')
            ->innerJoin('r.master', 'master')
            ->where("client.roles LIKE :role OR master.roles LIKE :role")
            ->andWhere("r.type = :type")
            ->setParameter('role', $role)
            ->setParameter('type', $type)
            ->getQuery()
            ->getResult();
    }
}
