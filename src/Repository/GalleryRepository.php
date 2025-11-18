<?php

namespace App\Repository;

use App\Entity\Gallery\Gallery;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Gallery>
 */
class GalleryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Gallery::class);
    }

    public function findUserGallery(User $user): array
    {
        return $this
            ->createQueryBuilder('g')
            ->where('g.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
