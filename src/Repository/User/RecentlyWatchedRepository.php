<?php

namespace App\Repository\User;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\RecentlyWatched;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RecentlyWatched>
 */
class RecentlyWatchedRepository extends ServiceEntityRepository
{
    /** Сколько последних просмотров хранится на одного пользователя. */
    public const int MAX_PER_OWNER = 50;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RecentlyWatched::class);
    }

    public function findOneByOwnerAndTicket(User $owner, Ticket $ticket): ?RecentlyWatched
    {
        return $this->findOneBy(['owner' => $owner, 'ticket' => $ticket]);
    }

    /**
     * Лента владельца, новые просмотры сверху, только те тикеты, что он вправе
     * видеть прямо сейчас — условие видимости то же, что у
     * GET /tickets/{id} (TicketGeographyLocalizationProvider::provide()):
     *   - публично: ticket.approved И публикатор (master для service, author —
     *     иначе) active+approved — дословно ApprovedTicketExtension;
     *   - либо владелец сам автор/мастер этого тикета (свой неодобренный
     *     тикет по прямой ссылке ему доступен, значит и в ленте остаётся).
     * Условие живёт в QueryBuilder, а не постфактум, чтобы пагинация и
     * totalItems соответствовали реально видимому набору (см. докблок
     * FavoriteVisibilityExtension — тот же довод).
     */
    public function queryVisibleByOwner(User $owner): QueryBuilder
    {
        return $this->createQueryBuilder('rw')
            ->innerJoin('rw.ticket', 't')
            ->leftJoin('t.author', 'ta')
            ->leftJoin('t.master', 'tm')
            ->where('rw.owner = :owner')
            ->andWhere(
                '(
                    t.approved = true AND (
                        (t.service = true  AND tm.active = true AND tm.approved = true)
                        OR
                        (t.service = false AND ta.active = true AND ta.approved = true)
                    )
                )
                OR t.author = :owner
                OR t.master = :owner'
            )
            ->setParameter('owner', $owner)
            ->orderBy('rw.viewedAt', 'DESC')
            ->addOrderBy('rw.id', 'DESC');
    }

    /**
     * Записи старше последних $keep — кандидаты на удаление (см.
     * MAX_PER_OWNER). Возвращает сущности, а не id: их немного, а удалять
     * через EntityManager проще, чем биндить массив uuid в DQL DELETE.
     *
     * @return RecentlyWatched[]
     */
    public function findOverflow(User $owner, int $keep = self::MAX_PER_OWNER): array
    {
        return $this->createQueryBuilder('rw')
            ->where('rw.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('rw.viewedAt', 'DESC')
            ->addOrderBy('rw.id', 'DESC')
            ->setFirstResult($keep)
            ->getQuery()
            ->getResult();
    }
}
