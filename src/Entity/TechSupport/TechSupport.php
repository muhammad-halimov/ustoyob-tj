<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiAdminApiTechSupportController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetAllTechSupportsController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetMyTechSupportsController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetTechSupportController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiUserApiTechSupportController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\ApiAssignTechSupportController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\ApiPatchTechSupportController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\ApiPostTechSupportController;
use App\Dto\Image\ImageInput;
use App\Dto\TechSupport\TechSupportAssignInput;
use App\Dto\TechSupport\TechSupportInput;
use App\Dto\TechSupport\TechSupportPostInput;
use App\Entity\Contract\HasImagesInterface;
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
        // ROLE_ADMIN: список всех тикетов в системе. Опционально ?status= фильтр.
        new GetCollection(
            uriTemplate: '/tech-supports',
            controller: ApiGetAllTechSupportsController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // Любой авторизованный: мои тикеты (где я автор ИЛИ администрант).
        new GetCollection(
            uriTemplate: '/tech-supports/me',
            controller: ApiGetMyTechSupportsController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // ROLE_ADMIN: тикеты конкретного пользователя по его ID.
        new GetCollection(
            uriTemplate: '/tech-supports/user/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiUserApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // ROLE_ADMIN: тикеты, назначенные на конкретного администратора по его ID.
        new GetCollection(
            uriTemplate: '/tech-supports/admin/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiAdminApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // Автор / администрант / ROLE_ADMIN: получить один тикет по ID.
        new Get(
            uriTemplate: '/tech-supports/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiGetTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // Авторизованный или гость (без токена): создать новый тикет.
        // Гость обязан передать guestEmail для обратной связи.
        new Post(
            uriTemplate: '/tech-supports',
            controller: ApiPostTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportPostInput::class,
        ),
        // Автор / администрант: изменить статус тикета (по правилам машины состояний).
        new Patch(
            uriTemplate: '/tech-supports/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportInput::class,
        ),
        // ROLE_ADMIN: назначить администранта на тикет. Тело: { "administrant": <userId> }.
        new Patch(
            uriTemplate: '/tech-supports/{id}/assign',
            requirements: ['id' => '\d+'],
            controller: ApiAssignTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportAssignInput::class,
        ),
        // Автор / администрант: загрузить фото напрямую к тикету (multipart/form-data, поле: imageFile[]).
        new Post(
            uriTemplate: '/tech-supports/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: ImageInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class TechSupport implements HasImagesInterface
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, PriorityTrait, AppealReasonTrait;

    public function __construct()
    {
        $this->techSupportMessages = new ArrayCollection();
        $this->images              = new ArrayCollection();
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
        G::TECH_SUPPORT_ADMIN,
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

    /**
     * Email гостевого пользователя (не авторизован).
     * Заполняется только когда тикет создаётся без JWT-токена.
     * Нужен, чтобы администратор мог связаться с пользователем по почте.
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[ApiProperty(writable: false)]
    private ?string $guestEmail = null;

    /**
     * Фотографии, прикреплённые напрямую к тикету (не через сообщение).
     * Загружаются через POST /tech-supports/{id}/upload-images.
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'techSupport', cascade: ['all'], orphanRemoval: true)]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[ApiProperty(writable: false)]
    private Collection $images;

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

    public function getGuestEmail(): ?string
    {
        return $this->guestEmail;
    }

    public function setGuestEmail(?string $guestEmail): static
    {
        $this->guestEmail = $guestEmail;
        return $this;
    }

    /** @return Collection<int, MultipleImage> */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setTechSupport($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            if ($image->getTechSupport() === $this) {
                $image->setTechSupport(null);
            }
        }

        return $this;
    }
}
