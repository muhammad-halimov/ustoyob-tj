<?php

namespace App\Entity\Ticket;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Ticket\PatchTicketController;
use App\Controller\Api\CRUD\Ticket\PostTicketController;
use App\Controller\Api\CRUD\Ticket\PostTicketPhotoController;
use App\Controller\Api\Filter\Ticket\Client\ClientsTicketCategoryFilterController;
use App\Controller\Api\Filter\Ticket\Client\ClientsTicketFilterController;
use App\Controller\Api\Filter\Ticket\Client\ClientTicketFilterController;
use App\Controller\Api\Filter\Ticket\Master\MastersTicketCategoryFilterController;
use App\Controller\Api\Filter\Ticket\Master\MastersTicketFilterController;
use App\Controller\Api\Filter\Ticket\Master\MasterTicketFilterController;
use App\Controller\Api\Filter\Ticket\PersonalTicketFilterController;
use App\Controller\Api\Filter\Ticket\TicketCategoryFilterController;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Geography\District\District;
use App\Entity\Review\Review;
use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\TicketRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: TicketRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/tickets/me',
            controller: PersonalTicketFilterController::class,
        ),
        new Get(
            uriTemplate: '/tickets/masters/category/{id}',
            controller: MastersTicketCategoryFilterController::class,
        ),
        new Get(
            uriTemplate: '/tickets/clients/category/{id}',
            controller: ClientsTicketCategoryFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets/category/{id}',
            controller: TicketCategoryFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets/masters',
            controller: MastersTicketFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets/masters/{id}',
            requirements: ['id' => '\d+'],
            controller: MasterTicketFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets/clients',
            controller: ClientsTicketFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets/clients/{id}',
            requirements: ['id' => '\d+'],
            controller: ClientTicketFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets',
        ),
        new Post(
            uriTemplate: '/tickets',
            controller: PostTicketController::class,
        ),
        new Post(
            uriTemplate: '/tickets/{id}/upload-photo',
            requirements: ['id' => '\d+'],
            controller: PostTicketPhotoController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchTicketController::class,
        ),
    ],
    normalizationContext: [
        'groups' => ['masterTickets:read', 'clientTickets:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Ticket
{
    public function __toString(): string
    {
        if (!$this->author && !$this->master) return $this->title;
        elseif(!$this->master) return "$this->title - $this->author";
        elseif(!$this->author) return "$this->title - $this->master";
        else return $this->title ?? "Ticket #$this->id";
    }

    public function __construct()
    {
        $this->userTicketImages = new ArrayCollection();
        $this->reviews = new ArrayCollection();
        $this->appealTicket = new ArrayCollection();
        $this->favorites = new ArrayCollection();
        $this->chats = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?string $description = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?string $notice = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?float $budget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?bool $active = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?User $master = null;

    /**
     * @var Collection<int, TicketImage>
     */
    #[ORM\OneToMany(targetEntity: TicketImage::class, mappedBy: 'userTicket', cascade: ['all'])]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $userTicketImages;

    #[ORM\ManyToOne(cascade: ['all'], inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'unit_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?Unit $unit = null;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'services')]
    #[Ignore]
    private Collection $reviews;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read'
    ])]
    private ?bool $service = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    #[SerializedName('district')]
    private ?District $address = null;

    /**
     * @var Collection<int, AppealTicket>
     */
    #[ORM\OneToMany(targetEntity: AppealTicket::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $appealTicket;

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\ManyToMany(targetEntity: Favorite::class, mappedBy: 'tickets')]
    #[Ignore]
    private Collection $favorites;

    /**
     * @var Collection<int, Chat>
     */
    #[ORM\OneToMany(targetEntity: Chat::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $chats;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return strip_tags($this->description);
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getNotice(): ?string
    {
        return strip_tags($this->notice);
    }

    public function setNotice(?string $notice): Ticket
    {
        $this->notice = $notice;
        return $this;
    }

    public function getBudget(): ?float
    {
        return $this->budget;
    }

    public function setBudget(?float $budget): static
    {
        $this->budget = $budget;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

        return $this;
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
     * @return Collection<int, TicketImage>
     */
    public function getUserTicketImages(): Collection
    {
        return $this->userTicketImages;
    }

    public function addUserTicketImage(TicketImage $userTicketImage): static
    {
        if (!$this->userTicketImages->contains($userTicketImage)) {
            $this->userTicketImages->add($userTicketImage);
            $userTicketImage->setUserTicket($this);
        }

        return $this;
    }

    public function removeUserTicketImage(TicketImage $userTicketImage): static
    {
        if ($this->userTicketImages->removeElement($userTicketImage)) {
            // set the owning side to null (unless already changed)
            if ($userTicketImage->getUserTicket() === $this) {
                $userTicketImage->setUserTicket(null);
            }
        }

        return $this;
    }

    public function getActive(): ?bool
    {
        return $this->active;
    }

    public function setActive(?bool $active): Ticket
    {
        $this->active = $active;
        return $this;
    }

    public function getUnit(): ?Unit
    {
        return $this->unit;
    }

    public function setUnit(?Unit $unit): static
    {
        $this->unit = $unit;

        return $this;
    }

    /**
     * @return Collection<int, Review>
     */
    public function getReviews(): Collection
    {
        return $this->reviews;
    }

    public function addReview(Review $review): static
    {
        if (!$this->reviews->contains($review)) {
            $this->reviews->add($review);
            $review->setServices($this);
        }

        return $this;
    }

    public function removeReview(Review $review): static
    {
        if ($this->reviews->removeElement($review)) {
            // set the owning side to null (unless already changed)
            if ($review->getServices() === $this) {
                $review->setServices(null);
            }
        }

        return $this;
    }

    public function getMaster(): ?User
    {
        return $this->master;
    }

    public function setMaster(?User $master): static
    {
        $this->master = $master;

        return $this;
    }

    public function getService(): ?bool
    {
        return $this->service;
    }

    public function setService(?bool $service): Ticket
    {
        $this->service = $service;
        return $this;
    }

    public function getAddress(): ?District
    {
        return $this->address;
    }

    public function setAddress(?District $address): static
    {
        $this->address = $address;

        return $this;
    }

    /**
     * @return Collection<int, AppealTicket>
     */
    public function getAppealTicket(): Collection
    {
        return $this->appealTicket;
    }

    public function addAppealTicket(AppealTicket $appeal): static
    {
        if (!$this->appealTicket->contains($appeal)) {
            $this->appealTicket->add($appeal);
            $appeal->setTicket($this);
        }

        return $this;
    }

    public function removeAppealTicket(AppealTicket $appeal): static
    {
        if ($this->appealTicket->removeElement($appeal)) {
            // set the owning side to null (unless already changed)
            if ($appeal->getTicket() === $this) {
                $appeal->setTicket(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getFavorites(): Collection
    {
        return $this->favorites;
    }

    public function addFavorite(Favorite $favorite): static
    {
        if (!$this->favorites->contains($favorite)) {
            $this->favorites->add($favorite);
            $favorite->addTicket($this);
        }

        return $this;
    }

    public function removeFavorite(Favorite $favorite): static
    {
        if ($this->favorites->removeElement($favorite)) {
            $favorite->removeTicket($this);
        }

        return $this;
    }

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    #[ORM\PrePersist]
    public function setCreatedAt(): void
    {
        $this->createdAt = new DateTime();
    }

    public function getUpdatedAt(): DateTime
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    #[ORM\PrePersist]
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new DateTime();
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getChats(): Collection
    {
        return $this->chats;
    }

    public function addChat(Chat $chat): static
    {
        if (!$this->chats->contains($chat)) {
            $this->chats->add($chat);
            $chat->setTicket($this);
        }

        return $this;
    }

    public function removeChat(Chat $chat): static
    {
        if ($this->chats->removeElement($chat)) {
            // set the owning side to null (unless already changed)
            if ($chat->getTicket() === $this) {
                $chat->setTicket(null);
            }
        }

        return $this;
    }
}
