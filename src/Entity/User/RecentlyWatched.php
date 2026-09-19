<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\User\RecentlyWatched\ApiGetRecentlyWatchedController;
use App\Controller\Api\CRUD\POST\User\RecentlyWatched\ApiPostRecentlyWatchedController;
use App\Dto\User\RecentlyWatchedInput;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\User\RecentlyWatchedRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * "Недавно просмотренные" объявления пользователя.
 *
 * Одна строка = одна пара (owner, ticket): повторный просмотр того же тикета
 * НЕ заводит вторую запись, а только обновляет $viewedAt (тикет "поднимается"
 * наверх ленты) — см. ApiPostRecentlyWatchedController. Уникальность держит
 * и БД (UniqueConstraint ниже), и контроллер (upsert).
 *
 * История ограничена RecentlyWatchedRepository::MAX_PER_OWNER последними
 * записями на пользователя — старшие удаляются при каждом POST, таблица не
 * растёт бесконечно.
 *
 * Оба FK — onDelete CASCADE: без тикета/владельца запись бессмысленна
 * (в отличие от Chat/Review, где история важна сама по себе).
 *
 * Только собственные записи: ни один эндпоинт не принимает owner из запроса,
 * он всегда берётся из Bearer-токена.
 */
#[ORM\Entity(repositoryClass: RecentlyWatchedRepository::class)]
#[ORM\Table(name: 'recently_watched')]
#[ORM\UniqueConstraint(name: 'UNIQ_RECENTLY_WATCHED_OWNER_TICKET', fields: ['owner', 'ticket'])]
#[ORM\Index(name: 'IDX_RECENTLY_WATCHED_OWNER_VIEWED', fields: ['owner', 'viewedAt'])]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/recently-watched',
            controller: ApiGetRecentlyWatchedController::class,
            normalizationContext: ['groups' => G::OPS_RECENTLY_WATCHED],
        ),
        new Post(
            uriTemplate: '/recently-watched',
            controller: ApiPostRecentlyWatchedController::class,
            normalizationContext: ['groups' => G::OPS_RECENTLY_WATCHED],
            input: RecentlyWatchedInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class RecentlyWatched
{
    public function __toString(): string
    {
        return 'RecentlyWatched';
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([G::RECENTLY_WATCHED])]
    private ?Uuid $id = null;

    /** Кто смотрел (из Bearer-токена, наружу не отдаётся). */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[ApiProperty(writable: false)]
    private ?User $owner = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups([G::RECENTLY_WATCHED])]
    private ?Ticket $ticket = null;

    /** Время последнего просмотра — по нему сортируется лента (новые сверху). */
    #[ORM\Column(type: 'datetime_immutable')]
    #[Groups([G::RECENTLY_WATCHED])]
    #[ApiProperty(writable: false)]
    private ?DateTimeImmutable $viewedAt = null;

    public function __construct()
    {
        $this->viewedAt = new DateTimeImmutable();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

        return $this;
    }

    public function getViewedAt(): ?DateTimeImmutable
    {
        return $this->viewedAt;
    }

    public function setViewedAt(DateTimeImmutable $viewedAt): static
    {
        $this->viewedAt = $viewedAt;

        return $this;
    }
}
