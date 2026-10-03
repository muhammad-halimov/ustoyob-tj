<?php

namespace App\Repository\User;

use App\Entity\User;
use App\Service\Extra\PhoneNumberUtil;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bridge\Doctrine\Security\User\UserLoaderInterface;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface, UserLoaderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Кто входит — для всего security (security.yaml: провайдер app_user_provider
     * без property, значит Symfony спрашивает здесь): вход по паролю
     * (/api/authentication_token — поле email, в нём может быть и телефон; форма
     * входа в админку), JWT и refresh-токены (в них User::getUserIdentifier() —
     * email, а у зарегистрированных по телефону — номер).
     *
     * Сначала email как есть (как и раньше), не нашёлся — то же значение как
     * номер телефона в любом написании (+992 90 123-45-67, 901234567…).
     */
    public function loadUserByIdentifier(string $identifier): ?User
    {
        $user = $this->findOneBy(['email' => $identifier]);
        if ($user !== null) return $user;

        $phone = PhoneNumberUtil::normalize($identifier);

        return $phone !== null ? $this->findOneBy(['phone' => $phone]) : null;
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

    public function findOneByRole(string $role, string $id): ?array
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

    /**
     * Все пользователи, способные администрировать (ROLE_ADMIN ИЛИ
     * ROLE_SUPER_ADMIN) — для балансировки нагрузки (AdminLoadBalancerService)
     * и подобных мест, где нужен именно полный список "живых" админов.
     *
     * НЕ то же самое, что findAllByRole('ROLE_ADMIN'): та бьёт LIKE-поиском
     * по сырой колонке roles в БД, а строка "ROLE_SUPER_ADMIN" НЕ содержит
     * подстроку "ROLE_ADMIN" (нет смежного "ROLE_ADMIN" внутри "ROLE_SUPER_ADMIN"),
     * так что findAllByRole('ROLE_ADMIN') супер-админов не находит вовсе.
     * User::getRoles() виртуально достраивает ROLE_ADMIN у супер-админа, но
     * это чисто PHP-уровневое расширение — до сырого SQL оно не доходит.
     * Отсюда и был баг: единственный реальный админ в проде имеет только
     * ROLE_SUPER_ADMIN, и findAllByRole('ROLE_ADMIN') возвращал пустой
     * массив → AdminLoadBalancerService::setLeastLoadedAdmin() молча
     * ничего не назначал (see if (empty($admins)) return;).
     */
    public function findAllAdmins(): array
    {
        return $this
            ->createQueryBuilder('u')
            ->where("CAST(u.roles AS text) LIKE :roleAdmin OR CAST(u.roles AS text) LIKE :roleSuperAdmin")
            ->setParameter('roleAdmin', '%ROLE_ADMIN%')
            ->setParameter('roleSuperAdmin', '%ROLE_SUPER_ADMIN%')
            ->getQuery()
            ->getResult();
    }

    public function findByOccupationId(string $occupationId): array
    {
        return $this->createQueryBuilder('u')
            ->join('u.occupation', 'o')
            ->where('o.id = :occupationId')
            ->setParameter('occupationId', $occupationId)
            ->getQuery()
            ->getResult();
    }

    /**
     * Тир 1 find-or-create во всех *OAuthService::findOrCreateUser() (см.
     * UserManagementInterface) — "уже привязан этот providerId к какому-
     * то User?". В отличие от UserOAuthProviderRepository::
     * findOneByProviderAndId(), сразу отдаёт User, а не саму связь —
     * этому методу не нужно различать "занято другим" от "занято мной",
     * это делает только LinkOAuthProviderController.
     */
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
