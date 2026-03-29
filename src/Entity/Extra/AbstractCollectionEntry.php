<?php

namespace App\Entity\Extra;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TypeTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Shared flat-entry base for BlackList and Favorite.
 * Each row represents exactly ONE blacklisted / favorited item:
 *   - a user   → user   is set, ticket is null
 *   - a ticket → ticket is set, user   is null
 */
#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
abstract class AbstractCollectionEntry
{
    use CreatedAtTrait, UpdatedAtTrait, TypeTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([G::BLACK_LISTS, G::FAVORITES])]
    protected ?int $id = null;

    /** The user who owns this entry (set from Bearer token, not exposed in output) */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[ApiProperty(writable: false)]
    protected ?User $owner = null;

    /** Blacklisted / favorited user (client or master) */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'target_user_id', nullable: true, onDelete: 'CASCADE')]
    #[Groups([G::BLACK_LISTS, G::FAVORITES])]
    protected ?User $user = null;

    /** Blacklisted / favorited ticket */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'target_ticket_id', nullable: true, onDelete: 'CASCADE')]
    #[Groups([G::BLACK_LISTS, G::FAVORITES])]
    protected ?Ticket $ticket = null;

    public function getId(): ?int
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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
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
}
