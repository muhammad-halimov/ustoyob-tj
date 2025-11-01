<?php

namespace App\Entity\Ticket;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\Ticket\ClientTicketFilterController;
use App\Controller\Api\Filter\Ticket\MasterTicketFilterController;
use App\Controller\Api\Filter\Ticket\PersonalTicketFilterController;
use App\Controller\Api\Filter\Ticket\RegularTicketFilterController;
use App\Controller\Api\Filter\Ticket\ServiceTicketFilterController;
use App\Entity\Geography\District;
use App\Entity\Service\Category;
use App\Entity\Service\Unit;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Entity\User\Appeal;
use App\Entity\User\Review;
use App\Repository\TicketRepository;
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
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/tickets/me',
            controller: PersonalTicketFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/tickets/masters',
            controller: ServiceTicketFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/tickets/masters/{id}',
            requirements: ['id' => '\d+'],
            controller: MasterTicketFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/tickets/clients',
            controller: RegularTicketFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/tickets/clients/{id}',
            requirements: ['id' => '\d+'],
            controller: ClientTicketFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/tickets',
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        )
    ],
    normalizationContext: [
        'groups' => ['userTickets:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Ticket
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->title;
    }

    public function __construct()
    {
        $this->userTicketImages = new ArrayCollection();
        $this->reviews = new ArrayCollection();
        $this->appeals = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'userTickets:read',
        'appeals:read',
        'appealsTicket:read',
        'reviews:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'userTickets:read',
        'appeals:read',
        'appealsTicket:read',
        'reviews:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'userTickets:read',
    ])]
    private ?string $description = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'userTickets:read',
    ])]
    private ?string $notice = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'userTickets:read',
    ])]
    private ?float $budget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'userTickets:read',
    ])]
    private ?bool $active = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'userTickets:read',
    ])]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'userTickets:read',
    ])]
    private ?User $author = null;

    /**
     * @var Collection<int, TicketImage>
     */
    #[ORM\OneToMany(targetEntity: TicketImage::class, mappedBy: 'userTicket')]
    #[Groups([
        'userTickets:read',
    ])]
    #[SerializedName('ticketImages')]
    private Collection $userTicketImages;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'unit_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'userTickets:read',
    ])]
    private ?Unit $unit = null;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'services')]
    #[Ignore]
    private Collection $reviews;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'userTickets:read',
    ])]
    private ?User $master = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'userTickets:read',
    ])]
    private ?bool $service = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'userTickets:read',
    ])]
    private ?District $address = null;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'ticket')]
    private Collection $appeals;

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
            // set the owning side to null (unless already changed)
            if ($appeal->getTicket() === $this) {
                $appeal->setTicket(null);
            }
        }

        return $this;
    }
}
