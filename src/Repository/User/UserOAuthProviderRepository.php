<?php

namespace App\Repository\User;

use App\Entity\Extra\OAuthProvider;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<OAuthProvider>
 */
class UserOAuthProviderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OAuthProvider::class);
    }

    public function findOneByProviderAndId(string $provider, string $providerId): ?OAuthProvider
    {
        return $this->findOneBy(['provider' => $provider, 'providerId' => $providerId]);
    }
}
