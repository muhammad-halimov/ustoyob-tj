<?php

namespace App\Repository\User;

use App\Entity\UserOAuthProvider;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserOAuthProvider>
 */
class UserOAuthProviderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserOAuthProvider::class);
    }

    public function findOneByProviderAndId(string $provider, string $providerId): ?UserOAuthProvider
    {
        return $this->findOneBy(['provider' => $provider, 'providerId' => $providerId]);
    }
}
