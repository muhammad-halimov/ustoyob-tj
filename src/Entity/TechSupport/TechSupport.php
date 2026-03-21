<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\TechSupport\AdminTechSupportFilterController;
use App\Controller\Api\CRUD\GET\TechSupport\PersonalTechSupportFilterController;
use App\Controller\Api\CRUD\GET\TechSupport\SupportReasonFilterController;
use App\Controller\Api\CRUD\GET\TechSupport\UserTechSupportFilterController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\PatchTechSupportController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\PostTechSupportController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\PostTechSupportPhotoController;
use App\Dto\Image\ImageInput;
use App\Dto\TechSupport\TechSupportInput;
use App\Entity\Appeal\AppealReason;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: TechSupportRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/tech-support/me',
            controller: PersonalTechSupportFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tech-support/user/{id}',
            controller: UserTechSupportFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tech-support/admin/{id}',
            controller: AdminTechSupportFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/tech-support/reasons',
            controller: SupportReasonFilterController::class,
        ),
        new Post(
            uriTemplate: '/tech-support',
            controller: PostTechSupportController::class,
        ),
        new Patch(
            uriTemplate: '/tech-support/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchTechSupportController::class,
            input: TechSupportInput::class,
        ),
        new Post(
            uriTemplate: '/tech-support/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostTechSupportPhotoController::class,
            input: ImageInput::class,
        ),
    ],
    normalizationContext: [
        'groups' => [
            'techSupport:read',
        ],
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class TechSupport
{
    public function __construct()
    {
        $this->techSupportImages = new ArrayCollection();
        $this->techSupportMessages = new ArrayCollection();
    }

    public const array STATUSES = [
        'Новый' => 'new',
        'Заново открыто' => 'renewed',
        'В прогрессе' => 'in_progress',
        'Решено' => 'resolved',
        'Закрыто' => 'closed',
    ];

    public const array PRIORITIES = [
        'Низкий' => 'low',
        'Средний' => 'normal',
        'Высокий' => 'high',
        'Экстренный' => 'urgent',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'techSupport:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'techSupport:read',
    ])]
    private ?string $title = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupport:read',
    ])]
    private ?AppealReason $reason = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'techSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $status = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'techSupport:read',
    ])]
    private ?string $priority = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'techSupport:read',
    ])]
    private ?string $description = null;

    /**
     * @var Collection<int, TechSupportImage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportImage::class, mappedBy: 'techSupport', cascade: ['all'])]
    #[Groups([
        'techSupport:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $techSupportImages;

    /**
     * @var Collection<int, TechSupportMessage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportMessage::class, mappedBy: 'techSupport', cascade: ['all'])]
    #[Groups([
        'techSupport:read',
    ])]
    #[SerializedName('messages')]
    #[ApiProperty(writable: false)]
    private Collection $techSupportMessages;

    #[ORM\ManyToOne(inversedBy: 'techSupports')]
    #[ORM\JoinColumn(name: 'administrant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $administrant = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportsAsAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'techSupport:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'techSupport:read',
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
    }

    /**
     * @return Collection<int, TechSupportImage>
     */
    public function getTechSupportImages(): Collection
    {
        return $this->techSupportImages;
    }

    public function addTechSupportImage(TechSupportImage $techSupportImage): static
    {
        if (!$this->techSupportImages->contains($techSupportImage)) {
            $this->techSupportImages->add($techSupportImage);
            $techSupportImage->setTechSupport($this);
        }

        return $this;
    }

    public function removeTechSupportImage(TechSupportImage $techSupportImage): static
    {
        if ($this->techSupportImages->removeElement($techSupportImage)) {
            // set the owning side to null (unless already changed)
            if ($techSupportImage->getTechSupport() === $this) {
                $techSupportImage->setTechSupport(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, TechSupportMessage>
     */
    public function getTechSupportMessages(): Collection
    {
        return $this->techSupportMessages;
    }

    public function addTechSupportMessage(TechSupportMessage $techSupportMessage): static
    {
        if (!$this->techSupportMessages->contains($techSupportMessage)) {
            $this->techSupportMessages->add($techSupportMessage);
            $techSupportMessage->setTechSupport($this);
        }

        return $this;
    }

    public function removeTechSupportMessage(TechSupportMessage $techSupportMessage): static
    {
        if ($this->techSupportMessages->removeElement($techSupportMessage)) {
            // set the owning side to null (unless already changed)
            if ($techSupportMessage->getTechSupport() === $this) {
                $techSupportMessage->setTechSupport(null);
            }
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

    public function getAdministrant(): ?User
    {
        return $this->administrant;
    }

    public function setAdministrant(?User $administrant): static
    {
        $this->administrant = $administrant;

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

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getReason(): ?AppealReason
    {
        return $this->reason;
    }

    public function setReason(?AppealReason $reason): static
    {
        $this->reason = $reason;
        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getPriority(): ?string
    {
        return $this->priority;
    }

    public function setPriority(?string $priority): static
    {
        $this->priority = $priority;
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
}
