<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiAdminApiTechSupportController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetMyTechSupportsController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiUserApiTechSupportController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\ApiPatchTechSupportController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\ApiPostTechSupportController;
use App\Dto\TechSupport\TechSupportInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\Readable\AppealReasonTrait;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
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
            uriTemplate: '/tech-supports/me',
            controller: ApiGetMyTechSupportsController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        new GetCollection(
            uriTemplate: '/tech-supports/user/{id}',
            controller: ApiUserApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        new GetCollection(
            uriTemplate: '/tech-supports/admin/{id}',
            controller: ApiAdminApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        new Post(
            uriTemplate: '/tech-supports',
            controller: ApiPostTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        new Patch(
            uriTemplate: '/tech-supports/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportInput::class,
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
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private ?string $status = null;

    /**
     * @var Collection<int, TechSupportMessage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportMessage::class, mappedBy: 'techSupport', cascade: ['all'])]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[SerializedName('messages')]
    #[ApiProperty(writable: false)]
    private Collection $techSupportMessages;

    #[ORM\ManyToOne(inversedBy: 'techSupports')]
    #[ORM\JoinColumn(name: 'administrant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private ?User $administrant = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportsAsAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
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
        G::TECH_SUPPORT,
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
