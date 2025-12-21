<?php

namespace App\Entity\Ticket;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Ticket\PatchTicketController;
use App\Controller\Api\CRUD\Ticket\PostTicketController;
use App\Controller\Api\CRUD\Ticket\PostTicketPhotoController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Controller\Api\Filter\Ticket\PersonalTicketFilterController;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Dto\Ticket\TicketInput;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Extra\BlackList;
use App\Entity\Extra\Favorite;
use App\Entity\Geography\Address;
use App\Entity\Review\Review;
use App\Entity\User;
use App\Entity\User\Occupation;
use App\Repository\TicketRepository;
use App\State\Localization\Geography\TicketGeographyLocalizationProvider;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TicketRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/tickets/me',
            controller: PersonalTicketFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets',
            provider: TicketGeographyLocalizationProvider::class,
        ),
        new Post(
            uriTemplate: '/tickets',
            controller: PostTicketController::class,
            input: TicketInput::class,
        ),
        new Post(
            uriTemplate: '/tickets/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostTicketPhotoController::class,
            input: AppealPhotoInput::class,
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
#[ApiFilter(BooleanFilter::class, properties: ['active', 'service'])]
#[ApiFilter(ExistsFilter::class, properties: ['master', 'author'])]
#[ApiFilter(SearchFilter::class, properties: ['category', 'master', 'author', 'description' => 'partial'])]
#[ApiFilter(AddressFilter::class)]
#[ApiFilter(RangeFilter::class, properties: ['budget', 'master.rating', 'author.rating'])]
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
        $this->addresses = new ArrayCollection();
        $this->ticketsBlackListedByAuthor = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
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
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?float $budget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?bool $negotiableBudget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
    ])]
    private ?bool $service = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
    ])]
    private ?bool $active = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'subcategory_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?Occupation $subcategory = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read'
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

    /**
     * @var Collection<int, Address>
     */
    #[ORM\ManyToMany(targetEntity: Address::class, inversedBy: 'tickets', cascade: ['all'])]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private Collection $addresses;

    /**
     * @var Collection<int, BlackList>
     */
    #[ORM\ManyToMany(targetEntity: BlackList::class, mappedBy: 'tickets')]
    #[Ignore]
    private Collection $ticketsBlackListedByAuthor;

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

    public function getNegotiableBudget(): ?bool
    {
        return $this->negotiableBudget;
    }

    public function setNegotiableBudget(?bool $negotiableBudget): static
    {
        $this->negotiableBudget = $negotiableBudget;
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

    /**
     * @return Collection<int, Address>
     */
    public function getAddresses(): Collection
    {
        return $this->addresses;
    }

    public function addAddress(Address $address): static
    {
        if (!$this->addresses->contains($address)) {
            $this->addresses->add($address);
        }

        return $this;
    }

    public function removeAddress(Address $address): static
    {
        $this->addresses->removeElement($address);

        return $this;
    }

    /**
     * @return Collection<int, BlackList>
     */
    public function getTicketsBlackListedByAuthor(): Collection
    {
        return $this->ticketsBlackListedByAuthor;
    }

    public function addTicketsBlackListedByAuthor(BlackList $ticketsBlackListedByAuthor): static
    {
        if (!$this->ticketsBlackListedByAuthor->contains($ticketsBlackListedByAuthor)) {
            $this->ticketsBlackListedByAuthor->add($ticketsBlackListedByAuthor);
            $ticketsBlackListedByAuthor->addTicket($this);
        }

        return $this;
    }

    public function removeTicketsBlackListedByAuthor(BlackList $ticketsBlackListedByAuthor): static
    {
        if ($this->ticketsBlackListedByAuthor->removeElement($ticketsBlackListedByAuthor)) {
            $ticketsBlackListedByAuthor->removeTicket($this);
        }

        return $this;
    }

    public function getSubcategory(): ?Occupation
    {
        return $this->subcategory;
    }

    public function setSubcategory(?Occupation $subcategory): static
    {
        $this->subcategory = $subcategory;

        return $this;
    }
}
