<?php

namespace App\Entity\Appeal;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Appeal\PersonalAppealsFilterController;
use App\Controller\Api\CRUD\POST\Appeal\PostAppealConntroller;
use App\Controller\Api\CRUD\POST\Appeal\PostAppealPhotoController;
use App\Dto\Appeal\Appeal\AppealInput;
use App\Dto\Image\ImageInput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealReview;
use App\Entity\Chat\Chat;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: AppealRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\InheritanceType('JOINED')]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/appeals/{id}',
            normalizationContext: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]],
            security: "is_granted('ROLE_ADMIN')",
        ),
        new GetCollection(
            uriTemplate: '/appeals',
            normalizationContext: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]],
            security: "is_granted('ROLE_ADMIN')",
        ),
        new GetCollection(
            uriTemplate: '/appeals/me',
            controller: PersonalAppealsFilterController::class,
            normalizationContext: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]],
        ),
        new Post(
            uriTemplate: '/appeals',
            controller: PostAppealConntroller::class,
            normalizationContext: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]],
            input: AppealInput::class,
        ),
        new Post(
            uriTemplate: '/appeals/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostAppealPhotoController::class,
            input: ImageInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: [
    'title' => 'partial',
    'description' => 'partial',
    'reason',
    'author',
    'respondent',
])]
abstract class Appeal
{
    use CreatedAtTrait, UpdatedAtTrait;

    public const array TYPES = [
        'Услуга / Объявление' => 'ticket',
        'Чат'                 => 'chat',
        'Отзыв'               => 'review',
        'Пользователь'        => 'user',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?string $type = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?string $description = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?AppealReason $reason = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'appealsAsRespondent')]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?User $respondent = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    private ?Ticket $ticket = null;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'appeal', cascade: ['all'])]
    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read', 'appeal:review:read', 'appeal:user:read'])]
    #[ApiProperty(writable: false)]
    #[SerializedName('images')]
    private Collection $images;

    public function __construct()
    {
        $this->images = new ArrayCollection();
    }

    public function __toString(): string
    {
        return $this->title ?? "Appeal #$this->id";
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;
        return $this;
    }

    public function getTypeLabel(): string
    {
        $label = array_search($this->getType(), self::TYPES);
        return $label !== false ? $label : $this->getType();
    }

    public function getChatAssoc(): ?Chat
    {
        return $this instanceof AppealChat ? $this->getChat() : null;
    }

    public function setChatAssoc(?Chat $chat): static
    {
        if ($this instanceof AppealChat) {
            $this->setChat($chat);
        }
        return $this;
    }

    public function getReviewAssoc(): ?Review
    {
        return $this instanceof AppealReview ? $this->getReview() : null;
    }

    public function setReviewAssoc(?Review $review): static
    {
        if ($this instanceof AppealReview) {
            $this->setReview($review);
        }
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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
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

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;
        return $this;
    }

    public function getRespondent(): ?User
    {
        return $this->respondent;
    }

    public function setRespondent(?User $respondent): static
    {
        $this->respondent = $respondent;
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

    /**
     * @return Collection<int, AppealImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(AppealImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setAppeal($this);
        }
        return $this;
    }

    public function removeImage(AppealImage $image): static
    {
        if ($this->images->removeElement($image)) {
            if ($image->getAppeal() === $this) {
                $image->setAppeal(null);
            }
        }
        return $this;
    }

    public function getInfo(): string
    {
        $typeCode  = $this instanceof AppealChat ? 'chat' : 'ticket';
        $typeHuman = array_search($typeCode, self::TYPES) ?: $typeCode;

        $lines = [
            "Тип жалобы: $typeHuman",
            "ID жалобы: " . ($this->id ?? 'N/A'),
            "Заголовок жалобы: " . ($this->title ?? 'N/A'),
            "Истец: " . ($this->author?->getEmail() ?? 'N/A'),
            "Ответчик: " . ($this->respondent?->getEmail() ?? 'N/A'),
            "Причина жалобы: " . ($this->reason?->getTitle() ?? 'N/A'),
            "Описание: " . ($this->description ?? 'N/A'),
        ];

        array_splice($lines, 2, 0, ["ID услуги/объявления: " . ($this->ticket?->getId() ?? 'N/A')]);

        if ($this instanceof AppealChat) {
            array_splice($lines, 2, 0, ["ID чата: " . ($this->getChat()?->getId() ?? 'N/A')]);
        } elseif ($this instanceof AppealReview) {
            array_splice($lines, 2, 0, ["ID отзыва: " . ($this->getReview()?->getId() ?? 'N/A')]);
        }

        return implode("\n", $lines);
    }
}
