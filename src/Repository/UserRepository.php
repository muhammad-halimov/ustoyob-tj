<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Exception;
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

    public function findByGoogleId(string $authId): User|null
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthType', 'o')
            ->where("o.googleId = :authId")
            ->setParameter('authId', $authId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByVKId(string $authId): User|null
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthType', 'o')
            ->where("o.vkId = :authId")
            ->setParameter('authId', $authId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByTelegramId(string $authId): User|null
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthType', 'o')
            ->where("o.telegramId = :authId")
            ->setParameter('authId', $authId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByFacebookId(string $authId): User|null
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthType', 'o')
            ->where("o.facebookId = :authId")
            ->setParameter('authId', $authId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByInstagramId(string $authId): User|null
    {
        return $this
            ->createQueryBuilder('u')
            ->join('u.oauthType', 'o')
            ->where("o.instagramId = :authId")
            ->setParameter('authId', $authId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
