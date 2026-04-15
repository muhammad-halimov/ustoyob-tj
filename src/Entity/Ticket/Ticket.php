<?php

namespace App\Entity\Ticket;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Ticket\Ticket\ApiGetMyTicketsController;
use App\Controller\Api\CRUD\PATCH\Ticket\Ticket\ApiPatchTicketController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\Ticket\Ticket\ApiPostTicketController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Dto\Image\ImageInput;
use App\Dto\Ticket\TicketInput;
use App\Dto\Ticket\TicketPatchInput;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Entity\Extra\MultipleImage;
use App\Entity\Geography\Abstract\Address;
use App\Entity\Review\Review;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Entity\User\Occupation;
use App\Repository\Ticket\TicketRepository;
use App\State\Localization\Geography\TicketGeographyLocalizationProvider;
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
            controller: ApiGetMyTicketsController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL],
        ),
        new Get(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL, 'skip_null_values' => false],
            provider: TicketGeographyLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets',
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL, 'skip_null_values' => false],
            provider: TicketGeographyLocalizationProvider::class,
        ),
        new Post(
            uriTemplate: '/tickets',
            controller: ApiPostTicketController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS],
            input: TicketInput::class,
        ),
        new Post(
            uriTemplate: '/tickets/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchTicketController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL],
            input: TicketPatchInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(BooleanFilter::class, properties: ['active', 'service', 'negotiableBudget'])]
#[ApiFilter(ExistsFilter::class, properties: ['master', 'author'])]
#[ApiFilter(SearchFilter::class, properties: ['category', 'subcategory', 'master', 'author', 'description' => 'partial'])]
#[ApiFilter(AddressFilter::class)]
#[ApiFilter(RangeFilter::class, properties: ['budget', 'master.rating', 'author.rating'])]
class Ticket
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait;

    public function __toString(): string
    {
        if (!$this->author && !$this->master) return $this->title;
        elseif(!$this->master) return "$this->title - $this->author";
        elseif(!$this->author) return "$this->title - $this->master";
        else return $this->title ?? "Ticket #$this->id";
    }

    public function __construct()
    {
        $this->reviews = new ArrayCollection();
        $this->appeals = new ArrayCollection();
        $this->chats = new ArrayCollection();
        $this->addresses = new ArrayCollection();
        $this->images = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?string $notice = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?float $budget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $negotiableBudget = false;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $service = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $active = null;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private int $viewsCount = 0;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private int $responsesCount = 0;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'subcategory_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Occupation $subcategory = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?User $master = null;

    #[ORM\ManyToOne(cascade: ['all'], inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'unit_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Unit $unit = null;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $reviews;

    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    #[SerializedName('reviewsCount')]
    public function getTicketReviewsCount(): ?int
    {
        return $this->reviews->count() ?? 0;
    }

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $appeals;

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
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private Collection $addresses;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'ticket', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private Collection $images;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getViewsCount(): int
    {
        return $this->viewsCount;
    }

    public function setViewsCount(int $viewsCount): static
    {
        $this->viewsCount = $viewsCount;

        return $this;
    }

    public function getResponsesCount(): int
    {
        return $this->responsesCount;
    }

    public function setResponsesCount(int $responsesCount): static
    {
        $this->responsesCount = $responsesCount;

        return $this;
    }

    public function incrementResponsesCount(): static
    {
        $this->responsesCount++;

        return $this;
    }

    public function incrementViewsCount(): static
    {
        $this->viewsCount++;
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
            $review->setTicket($this);
        }

        return $this;
    }

    public function removeReview(Review $review): static
    {
        if ($this->reviews->removeElement($review)) {
            // set the owning side to null (unless already changed)
            if ($review->getTicket() === $this) {
                $review->setTicket(null);
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
     * @return Collection<int, Appeal>
     */
    public function getAppeals(): Collection
    {
        return $this->appeals;
    }

    public function addAppeal(Appeal $appeal): static
    {
        if (!$this->appeals->contains($appeal)) {
            $this->appeals->add($appeal);
            $appeal->setTicket($this);
        }

        return $this;
    }

    public function removeAppeal(Appeal $appeal): static
    {
        if ($this->appeals->removeElement($appeal)) {
            if ($appeal->getTicket() === $this) {
                $appeal->setTicket(null);
            }
        }

        return $this;
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


    public function getSubcategory(): ?Occupation
    {
        return $this->subcategory;
    }

    public function setSubcategory(?Occupation $subcategory): static
    {
        $this->subcategory = $subcategory;

        return $this;
    }

    /**
     * @return Collection<int, MultipleImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setTicket($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getTicket() === $this) {
                $image->setTicket(null);
            }
        }

        return $this;
    }

}
