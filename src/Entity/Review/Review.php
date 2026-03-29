<?php

namespace App\Entity\Review;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Review\Review\ApiGetMyReviewsController;
use App\Controller\Api\CRUD\PATCH\Review\Review\ApiPatchReviewController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\Review\Review\ApiPostReviewController;
use App\Dto\Image\ImageInput;
use App\Dto\Review\ReviewPatchInput;
use App\Entity\Appeal\Types\AppealReview;
use App\Entity\Extra\MultipleImage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\TypeTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Review\ReviewRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReviewRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/reviews/me',
            controller: ApiGetMyReviewsController::class,
            normalizationContext: ['groups' => G::OPS_REVIEWS],
        ),
        new GetCollection(
            uriTemplate: '/reviews',
            normalizationContext: ['groups' => G::OPS_REVIEWS, 'skip_null_values' => false],
        ),
        new Post(
            uriTemplate: '/reviews/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            normalizationContext: ['groups' => G::OPS_REVIEWS],
            input: ImageInput::class,
        ),
        new Post(
            uriTemplate: '/reviews',
            controller: ApiPostReviewController::class,
            normalizationContext: ['groups' => G::OPS_REVIEWS],
        ),
        new Patch(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchReviewController::class,
            normalizationContext: ['groups' => G::OPS_REVIEWS],
            input: ReviewPatchInput::class,
        ),
        new Delete(
            uriTemplate: '/reviews/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => G::OPS_REVIEWS],
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
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(BooleanFilter::class, properties: ['ticket.service'])]
#[ApiFilter(ExistsFilter::class, properties: ['ticket', 'master', 'client', 'images'])]
#[ApiFilter(SearchFilter::class, properties: [
    'type',
    'master',
    'client',
    'description' => 'partial',
    'ticket',
    'ticket.title',
])]
#[ApiFilter(RangeFilter::class, properties: ['rating'])]
class Review
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, TypeTrait;

    public function __construct()
    {
        $this->appealReviews = new ArrayCollection();
        $this->images = new ArrayCollection();
    }

    public function __toString(): string
    {
        $desc = $this->description ? mb_strimwidth(strip_tags($this->description), 0, 50, '…') : null;
        return $desc ?? "Review #{$this->id}";
    }

    public const array TYPES = [
        'Отзыв клиенту' => 'client',
        'Отзыв мастеру' => 'master',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::APPEAL_REVIEW,
    ])]
    private ?int $id = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::APPEAL_REVIEW,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    #[Assert\LessThanOrEqual(value: 5.0, message: 'Field cannot be greater than 5')]
    private ?float $rating = null;

    #[ORM\ManyToOne(inversedBy: 'reviews')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::REVIEWS,
        G::APPEAL_REVIEW,
    ])]
    private ?Ticket $ticket = null;

    /**
     * @var Collection<int, AppealReview>
     */
    #[ORM\OneToMany(targetEntity: AppealReview::class, mappedBy: 'review')]
    #[Ignore]
    private Collection $appealReviews;

    #[ORM\ManyToOne(inversedBy: 'masterReviews')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::APPEAL_REVIEW,
    ])]
    private ?User $master = null;

    #[ORM\ManyToOne(inversedBy: 'clientReviews')]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::APPEAL_REVIEW,
    ])]
    private ?User $client = null;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'review')]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::APPEAL_REVIEW,
    ])]
    private Collection $images;

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

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

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

    /**
     * @return Collection<int, AppealReview>
     */
    public function getAppealReviews(): Collection
    {
        return $this->appealReviews;
    }

    public function addAppealReview(AppealReview $appealReview): static
    {
        if (!$this->appealReviews->contains($appealReview)) {
            $this->appealReviews->add($appealReview);
            $appealReview->setReview($this);
        }
        return $this;
    }

    public function removeAppealReview(AppealReview $appealReview): static
    {
        if ($this->appealReviews->removeElement($appealReview)) {
            if ($appealReview->getReview() === $this) {
                $appealReview->setReview(null);
            }
        }
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
            $image->setReview($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getReview() === $this) {
                $image->setReview(null);
            }
        }

        return $this;
    }
}
