<?php

namespace App\Entity\Review;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\Review\ClientReviewFilterController;
use App\Controller\Api\Filter\Review\MasterReviewFilterController;
use App\Controller\Api\Filter\Review\PersonalReviewFilterController;
use App\Controller\Api\Filter\Review\PostReviewPhotoController;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\ReviewRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: ReviewRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/reviews/me',
            controller: PersonalReviewFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/reviews/masters/{id}',
            requirements: ['id' => '\d+'],
            controller: MasterReviewFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/reviews/clients/{id}',
            requirements: ['id' => '\d+'],
            controller: ClientReviewFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/reviews',
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/reviews/{id}/upload-photo',
            requirements: ['id' => '\d+'],
            controller: PostReviewPhotoController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        )
    ],
    normalizationContext: [
        'groups' => ['reviews:read', 'reviewsClient:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Review
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->description[15] ?? "Review #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?float $rating = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?string $description = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?bool $forClient = null;

    #[ORM\ManyToOne(inversedBy: 'reviews')]
    #[ORM\JoinColumn(name: 'services_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'reviews:read',
    ])]
    private ?Ticket $services = null;

    /**
     * @var Collection<int, ReviewImage>
     */
    #[ORM\OneToMany(targetEntity: ReviewImage::class, mappedBy: 'reviews')]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $reviewImages;

    #[ORM\ManyToOne(inversedBy: 'masterReviews')]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?User $master = null;

    #[ORM\ManyToOne(inversedBy: 'clientReviews')]
    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    private ?User $client = null;

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

    public function getForClient(): ?bool
    {
        return $this->forClient;
    }

    public function setForClient(?bool $forClient): Review
    {
        $this->forClient = $forClient;
        return $this;
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
}
