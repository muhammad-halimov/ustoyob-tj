<?php

namespace App\Entity\Extra;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\User\BlackList\PatchBlackListController;
use App\Controller\Api\CRUD\User\BlackList\PostBlackListController;
use App\Controller\Api\Filter\User\PersonalBlackListFilterController;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\BlackListRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: BlackListRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/black-lists/me',
            controller: PersonalBlackListFilterController::class,
        ),
        new Post(
            uriTemplate: '/black-lists',
            controller: PostBlackListController::class,
        ),
        new Patch(
            uriTemplate: '/black-lists/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchBlackListController::class,
        ),
        new Delete(
            uriTemplate: '/black-lists/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 (is_granted('ROLE_MASTER') and
                 object.getAuthor() == user)
                            or
                 (is_granted('ROLE_CLIENT') and
                 object.getAuthor() == user)",
        ),
    ],
    normalizationContext: [
        'groups' => ['blackLists:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class BlackList
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return "BlackList #$this->id";
    }

    public function __construct()
    {
        $this->clients = new ArrayCollection();
        $this->masters = new ArrayCollection();
        $this->tickets = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'blackLists:read'
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'blackLists')]
    #[ApiProperty(writable: false)]
    #[Groups([
        'blackLists:read'
    ])]
    private ?User $author = null;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'clientsBlackListedByAuthor')]
    #[ORM\JoinTable(name: 'black_list_clients')]
    #[Groups([
        'blackLists:read'
    ])]
    private Collection $clients;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'mastersBlackListedByAuthor')]
    #[ORM\JoinTable(name: 'black_list_masters')]
    #[Groups([
        'blackLists:read'
    ])]
    private Collection $masters;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\ManyToMany(targetEntity: Ticket::class, inversedBy: 'ticketsBlackListedByAuthor')]
    #[Groups([
        'blackLists:read'
    ])]
    private Collection $tickets;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

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
}
