<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\TechSupport\AdminTechSupportFilterController;
use App\Controller\Api\CRUD\GET\TechSupport\PersonalTechSupportFilterController;
use App\Controller\Api\CRUD\GET\TechSupport\UserTechSupportFilterController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\PatchTechSupportController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\PostTechSupportController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\PostTechSupportPhotoController;
use App\Dto\Image\ImageInput;
use App\Dto\TechSupport\TechSupportInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\AppealReasonTrait;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\DescriptionTrait;
use App\Entity\Trait\PriorityTrait;
use App\Entity\Trait\TitleTrait;
use App\Entity\Trait\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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
            normalizationContext: ['groups' => ['techSupport:read']],
        ),
        new GetCollection(
            uriTemplate: '/tech-support/user/{id}',
            controller: UserTechSupportFilterController::class,
            normalizationContext: ['groups' => ['techSupport:read']],
        ),
        new GetCollection(
            uriTemplate: '/tech-support/admin/{id}',
            controller: AdminTechSupportFilterController::class,
            normalizationContext: ['groups' => ['techSupport:read']],
        ),
        new Post(
            uriTemplate: '/tech-support',
            controller: PostTechSupportController::class,
            normalizationContext: ['groups' => ['techSupport:read']],
        ),
        new Patch(
            uriTemplate: '/tech-support/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchTechSupportController::class,
            normalizationContext: ['groups' => ['techSupport:read']],
            input: TechSupportInput::class,
        ),
        new Post(
            uriTemplate: '/tech-support/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostTechSupportPhotoController::class,
            normalizationContext: ['groups' => ['techSupport:read']],
            input: ImageInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class TechSupport
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, PriorityTrait, AppealReasonTrait;

    public function __construct()
    {
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
        'Низкий' => 1,
        'Средний' => 2,
        'Высокий' => 3,
        'Экстренный' => 4,
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
    #[ApiProperty(writable: false)]
    private ?string $status = null;

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

    public function getId(): ?int
    {
        return $this->id;
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

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): static
    {
        $this->status = $status;
        return $this;
    }

    /**
     * Returns all MultipleImage objects from all messages, sorted newest first.
     *
     * @return MultipleImage[]
     */
    #[Groups([
        'techSupport:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    public function getImages(): array
    {
        $images = [];

        foreach ($this->techSupportMessages as $techSupportMessage) {
            foreach ($techSupportMessage->getImages() as $image) {
                $images[] = $image;
            }
        }

        usort($images, fn(MultipleImage $a, MultipleImage $b) => $b->getCreatedAt() <=> $a->getCreatedAt());

        return $images;
    }
}
