<?php

namespace App\Repository\Appeal;

use App\Entity\Appeal\Types\AppealUser;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AppealUser>
 */
class AppealUserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppealUser::class);
    }
}
