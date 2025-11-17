<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\User\Favorite\DeleteFavoriteController;
use App\Controller\Api\Filter\User\Favorite\PatchFavoriteController;
use App\Controller\Api\Filter\User\Favorite\PersonalFavoriteFilterController;
use App\Controller\Api\Filter\User\Favorite\PostFavoriteController;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: FavoriteRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/favorites/me',
            controller: PersonalFavoriteFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/favorites',
            controller: PostFavoriteController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchFavoriteController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete(
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            controller: DeleteFavoriteController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
    ],
    normalizationContext: [
        'groups' => ['favorites:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Favorite
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __construct()
    {
        $this->tickets = new ArrayCollection();
        $this->clients = new ArrayCollection();
        $this->masters = new ArrayCollection();
    }

    public function __toString(): string
    {
        return "Favorite #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'favorites:read'
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'favorites')]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'favorites:read'
    ])]
    #[ApiProperty(writable: false)]
    private ?User $user = null;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\ManyToMany(targetEntity: Ticket::class, inversedBy: 'favorites')]
    #[Groups([
        'favorites:read'
    ])]
    private Collection $tickets;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'clientsFavorites')]
    #[ORM\JoinTable(name: 'favorite_client')]
    #[Groups([
        'favorites:read'
    ])]
    private Collection $clients;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'mastersFavorites')]
    #[ORM\JoinTable(name: 'favorite_master')]
    #[Groups([
        'favorites:read'
    ])]
    private Collection $masters;

    public function getId(): ?int
    {
        return $this->id;
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

    /**
     * @return Collection<int, Ticket>
     */
    public function getTickets(): Collection
    {
        return $this->tickets;
    }

    public function addTicket(Ticket $ticket): static
    {
        if (!$this->tickets->contains($ticket)) {
            $this->tickets->add($ticket);
        }

        return $this;
    }

    public function removeTicket(Ticket $ticket): static
    {
        $this->tickets->removeElement($ticket);

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getClients(): Collection
    {
        return $this->clients;
    }

    public function addClient(User $client): static
    {
        if (!$this->clients->contains($client)) {
            $this->clients->add($client);
        }

        return $this;
    }

    public function removeClient(User $client): static
    {
        $this->clients->removeElement($client);

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getMasters(): Collection
    {
        return $this->masters;
    }

    public function addMaster(User $master): static
    {
        if (!$this->masters->contains($master)) {
            $this->masters->add($master);
        }

        return $this;
    }

    public function removeMaster(User $master): static
    {
        $this->masters->removeElement($master);

        return $this;
    }
}
