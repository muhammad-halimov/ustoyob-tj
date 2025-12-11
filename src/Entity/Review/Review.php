<?php

namespace App\Entity\Review;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Review\PatchReviewController;
use App\Controller\Api\CRUD\Review\PostReviewController;
use App\Controller\Api\CRUD\Review\PostReviewPhotoController;
use App\Controller\Api\Filter\Review\PersonalReviewFilterController;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\ReviewRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReviewRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/reviews/me',
            controller: PersonalReviewFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/reviews',
        ),
        new Post(
            uriTemplate: '/reviews/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostReviewPhotoController::class,
            input: AppealPhotoInput::class,
        ),
        new Post(
            uriTemplate: '/reviews',
            controller: PostReviewController::class,
        ),
        new Patch(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchReviewController::class,
        ),
        new Delete(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 (is_granted('ROLE_MASTER') and
                 object.getMaster() == user and
                 object.getType() == 'client')
                            or
                 (is_granted('ROLE_CLIENT') and
                 object.getClient() == user and
                 object.getType() == 'master')",
        )
    ],
    normalizationContext: [
        'groups' => ['reviews:read', 'reviewsClient:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
#[ApiFilter(BooleanFilter::class, properties: ['services.service'])]
#[ApiFilter(ExistsFilter::class, properties: ['services', 'master', 'client', 'reviewImages',])]
#[ApiFilter(SearchFilter::class, properties: [
    'type',
    'master',
    'client',
    'description',
    'services',
    'services.title',
])]
#[ApiFilter(RangeFilter::class, properties: ['rating'])]
class Review
{
    public function __toString(): string
    {
        return $this->description[15] ?? "Review #$this->id";
    }

    public const array TYPES = [
        'Отзыв клиенту' => 'client',
        'Отзыв мастеру' => 'master',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?string $type = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    #[Assert\LessThanOrEqual(value: 5, message: 'Field cannot be greater than 5')]
    private ?float $rating = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'reviews')]
    #[ORM\JoinColumn(name: 'services_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'reviews:read',
    ])]
    #[SerializedName('ticket')]
    private ?Ticket $services = null;

    /**
     * @var Collection<int, ReviewImage>
     */
    #[ORM\OneToMany(targetEntity: ReviewImage::class, mappedBy: 'reviews', cascade: ['all'])]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $reviewImages;

    #[ORM\ManyToOne(inversedBy: 'masterReviews')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?User $master = null;

    #[ORM\ManyToOne(inversedBy: 'clientReviews')]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?User $client = null;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    protected DateTime $updatedAt;

    public function __construct()
    {
        $this->reviewImages = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRating(): ?float
    {
        return $this->rating;
    }

    public function setRating(?float $rating): static
    {
        $this->rating = $rating;

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

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(?string $type): void
    {
        $this->type = $type;
    }

    public function getServices(): ?Ticket
    {
        return $this->services;
    }

    public function setServices(?Ticket $services): static
    {
        $this->services = $services;

        return $this;
    }

    /**
     * @return Collection<int, ReviewImage>
     */
    public function getReviewImages(): Collection
    {
        return $this->reviewImages;
    }

    public function addReviewImage(ReviewImage $reviewImage): static
    {
        if (!$this->reviewImages->contains($reviewImage)) {
            $this->reviewImages->add($reviewImage);
            $reviewImage->setReviews($this);
        }

        return $this;
    }

    public function removeReviewImage(ReviewImage $reviewImage): static
    {
        if ($this->reviewImages->removeElement($reviewImage)) {
            // set the owning side to null (unless already changed)
            if ($reviewImage->getReviews() === $this) {
                $reviewImage->setReviews(null);
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

    public function getClient(): ?User
    {
        return $this->client;
    }

    public function setClient(?User $client): static
    {
        $this->client = $client;

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
}
