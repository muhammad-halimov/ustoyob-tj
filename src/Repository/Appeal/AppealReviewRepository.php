<?php

namespace App\Repository\Appeal;

use App\Entity\Appeal\Types\AppealReview;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AppealReview>
 */
class AppealReviewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppealReview::class);
    }
}
