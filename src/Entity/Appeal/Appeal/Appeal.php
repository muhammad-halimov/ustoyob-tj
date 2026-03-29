<?php

namespace App\Entity\Appeal\Appeal;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Appeal\Appeal\ApiGetMyAppealsController;
use App\Controller\Api\CRUD\POST\Appeal\Appeal\ApiPostAppealConntroller;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Dto\Appeal\AppealInput;
use App\Dto\Image\ImageInput;
use App\Entity\Appeal\Types\AppealChat;
use App\Entity\Appeal\Types\AppealReview;
use App\Entity\Chat\Chat;
use App\Entity\Extra\MultipleImage;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\AppealReasonTrait;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\TypeTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\State\Localization\Appeal\AppealLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: AppealRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\InheritanceType('JOINED')]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/appeals/me',
            controller: ApiGetMyAppealsController::class,
            normalizationContext: ['groups' => G::OPS_APPEALS],
        ),
        new Get(
            uriTemplate: '/appeals/{id}',
            normalizationContext: ['groups' => G::OPS_APPEALS],
            security: "is_granted('ROLE_ADMIN')",
            provider: AppealLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/appeals',
            normalizationContext: ['groups' => G::OPS_APPEALS],
            security: "is_granted('ROLE_ADMIN')",
            provider: AppealLocalizationProvider::class,
        ),
        new Post(
            uriTemplate: '/appeals',
            controller: ApiPostAppealConntroller::class,
            normalizationContext: ['groups' => G::OPS_APPEALS],
            input: AppealInput::class,
        ),
        new Post(
            uriTemplate: '/appeals/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            input: ImageInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: [
    'type',
    'title' => 'partial',
    'description' => 'partial',
    'reason',
    'author',
    'respondent',
])]
abstract class Appeal
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, TypeTrait, AppealReasonTrait;

    public const array TYPES = [
        'Услуга / Объявление' => 'ticket',
        'Чат'                 => 'chat',
        'Отзыв'               => 'review',
        'Пользователь'        => 'user',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[Groups([
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'appealsAsRespondent')]
    #[Groups([
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER
    ])]
    private ?User $respondent = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([G::APPEAL_TICKET])]
    private ?Ticket $ticket = null;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'appeal')]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER
    ])]
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

    public function getTypeLabel(): string
    {
        $label = array_search($this->getType(), self::TYPES);
        return $label !== false ? $label : $this->getType();
    }

    #[Groups([G::APPEAL_CHAT])]
    #[SerializedName('chat')]
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

    #[Groups([G::APPEAL_REVIEW])]
    #[SerializedName('review')]
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
            $image->setAppeal($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getAppeal() === $this) {
                $image->setAppeal(null);
            }
        }

        return $this;
    }
}
