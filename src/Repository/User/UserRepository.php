<?php

namespace App\Repository\User;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    public function findOneByRole(string $role, int $id): ?array
    {
        return $this
            ->createQueryBuilder('u')
//            ->where("u.roles LIKE :role")
            ->where("CAST(u.roles AS text) LIKE :role")
            ->andWhere("u.id = :id")
            ->setParameter('role', '%' . $role . '%')
            ->setParameter('id', $id)
            ->getQuery()
            ->getResult();
    }

    public function findAllByRole(string $role): ?array
    {
        return $this
            ->createQueryBuilder('u')
//            ->where("u.roles LIKE :role")
            ->where("CAST(u.roles AS text) LIKE :role")
            ->setParameter('role', '%' . $role . '%')
            ->getQuery()
            ->getResult();
    }

    public function findByOccupationId(int $occupationId): array
    {
        return $this->createQueryBuilder('u')
            ->join('u.occupation', 'o')
            ->where('o.id = :occupationId')
            ->setParameter('occupationId', $occupationId)
            ->getQuery()
            ->getResult();
    }

    public function findByOAuthProvider(string $provider, string $providerId): ?User
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthProviders', 'o')
            ->where('o.provider = :provider')
            ->andWhere('o.providerId = :providerId')
            ->setParameter('provider', $provider)
            ->setParameter('providerId', $providerId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Возвращает пользователей, которые так и не активировали аккаунт
     * (active = false, approved = false) и зарегистрировались более $days дней назад.
     *
     * @return User[]
     */
    public function findUnactivatedOlderThan(int $days): array
    {
        $threshold = new \DateTimeImmutable("-{$days} days");

        return $this->createQueryBuilder('u')
            ->where('u.active = :active')
            ->andWhere('u.approved = :approved')
            ->andWhere('u.createdAt < :threshold')
            ->setParameter('active',    false)
            ->setParameter('approved',  false)
            ->setParameter('threshold', $threshold)
            ->getQuery()
            ->getResult();
    }

}
