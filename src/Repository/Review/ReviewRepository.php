<?php

namespace App\Repository\Review;

use App\Entity\Review\Review;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
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

    public function findExistingReviewByAuthorAndTicket(User $author, \App\Entity\Ticket\Ticket $ticket): ?Review
    {
        return $this->createQueryBuilder('r')
            ->where('r.ticket = :ticket')
            ->andWhere('r.master = :author OR r.client = :author')
            ->setParameter('ticket', $ticket)
            ->setParameter('author', $author)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findUserReviews(User $user): ?QueryBuilder
    {
        if (in_array('ROLE_CLIENT', $user->getRoles())) {
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.client', 'rev')
                ->where('r.client = :client')
                ->andWhere("r.type = :type")
                ->andWhere("CAST(rev.roles AS text) LIKE :role")
                ->setParameter('client', $user)
                ->setParameter('type', "master")
                ->setParameter('role', '%ROLE_CLIENT%');
        }

        if (in_array('ROLE_MASTER', $user->getRoles())) {
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.master', 'master')
                ->where('r.master = :master')
                ->andWhere("r.type = :type")
                ->andWhere("CAST(master.roles AS text) LIKE :role")
                ->setParameter('master', $user)
                ->setParameter('type', "client")
                ->setParameter('role', '%ROLE_MASTER%');
        }

        return null;
    }

    public function findReviewsByTypeAndRole(User $user, string $type, string $role): array
    {
        if ($type == "master" && $role == '%ROLE_MASTER%'){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.master', 'master')
//            ->where("master.roles LIKE :role")
                ->where("CAST(master.roles AS text) LIKE :role")
                ->andWhere('r.master = :user')
                ->andWhere("r.type = :type")
                ->setParameter('role', $role)
                ->setParameter('user', $user)
                ->setParameter('type', $type)
                ->getQuery()
                ->getResult();
        } elseif ($type == "client" && $role == '%ROLE_CLIENT%'){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.client', 'client')
//            ->where("client.roles LIKE :role")
                ->where("CAST(client.roles AS text) LIKE :role")
                ->andWhere('r.client = :user')
                ->andWhere("r.type = :type")
                ->setParameter('role', $role)
                ->setParameter('user', $user)
                ->setParameter('type', $type)
                ->getQuery()
                ->getResult();
        }

        return [];
    }

    public function findReviewsByType(string $type, string $role): array
    {
        if ($type == "master" && $role == '%ROLE_MASTER%'){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.master', 'master')
//            ->where("master.roles LIKE :role")
                ->where("CAST(master.roles AS text) LIKE :role")
                ->andWhere("r.type = :type")
                ->setParameter('role', $role)
                ->setParameter('type', $type)
                ->getQuery()
                ->getResult();
        } elseif ($type == "client" && $role == '%ROLE_CLIENT%'){
            return $this
                ->createQueryBuilder('r')
                ->innerJoin('r.client', 'client')
//            ->where("client.roles LIKE :role")
                ->where("CAST(client.roles AS text) LIKE :role")
                ->andWhere("r.type = :type")
                ->setParameter('role', $role)
                ->setParameter('type', $type)
                ->getQuery()
                ->getResult();
        }

        return [];
    }
}
