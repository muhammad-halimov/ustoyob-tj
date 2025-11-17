<?php

namespace App\Entity\Appeal;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\Appeal\Compliant\TicketComplaintFilterController;
use App\Controller\Api\Filter\Appeal\Compliant\UserComplaintFilterController;
use App\Controller\Api\Filter\Appeal\PostAppealPhotoController;
use App\Controller\Api\Filter\Appeal\Support\AdminSupportFilterController;
use App\Controller\Api\Filter\Appeal\Support\UserSupportFilterController;
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
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/appeals/complaints/ticket/{id}',
            controller: TicketComplaintFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/appeals/complaints/user/{id}',
            controller: UserComplaintFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/appeals/support/user/{id}',
            controller: UserSupportFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/appeals/support/admin/{id}',
            controller: AdminSupportFilterController::class,
            security: "is_granted('ROLE_ADMIN')"
        ),
        new Post(
            uriTemplate: '/appeals',
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/appeals/{id}/upload-photo',
            requirements: ['id' => '\d+'],
            controller: PostAppealPhotoController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/appeals/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
    ],
    normalizationContext: [
        'groups' => [
            'appeals:read',
            'appealsTicket:read',
            'appealsSupport:read',
        ],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Appeal
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->compliantReason ?? "Пустой заголовок жалобы";
    }

    public function __construct()
    {
        $this->appealImages = new ArrayCollection();
        $this->appealMessages = new ArrayCollection();
    }

    public const COMPLAINTS = [
        'Опоздание/Отсутствие' => 'lateness',
        'Плохое качество' => 'bad_quality',
        'Повреждения имущества' => 'property_damage',
        'Завышение стоимости' => 'overpricing',
        'Непрофессионализм' => 'unprofessionalism',
        'Мошенничество' => 'fraud',
        'Расизм/Нацизм' => 'racism_or_nazism',
        'Другое' => 'other',
    ];

    public const SUPPORT = [
        'Проблемы с аккаунтом' => 'account',
        'Проблемы с объявлениями' => 'ticket',
        'Вопросы по работе платформы' => 'platform',
        'Технические проблемы' => 'issues',
        'Юридические вопросы' => 'law',
        'Предложения и фидбек' => 'feedback',
        'Экстренный' => 'urgent',
        'Другое' => 'other',
    ];

    public const TYPES = [
        'Жалоба' => 'complaint',
        'Тех. поддержка' => 'support',
    ];

    public const STATUSES = [
        'Новый' => 'new',
        'В прогрессе' => 'in_progress',
        'Решено' => 'resolved',
        'Закрыто' => 'closed',
    ];

    public const PRIORITIES = [
        'Низкий' => 'low',
        'Средний' => 'normal',
        'Высокий' => 'high',
        'Экстренный' => 'urgent',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?string $compliantReason = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appealsSupport:read',
    ])]
    private ?string $supportReason = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    private ?string $type = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appealsSupport:read',
    ])]
    private ?string $status = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appealsSupport:read',
    ])]
    private ?string $priority = null;

    #[ORM\ManyToOne(inversedBy: 'administrantAppeals')]
    #[ORM\JoinColumn(name: 'administrant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appealsSupport:read',
    ])]
    private ?User $administrant = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'appealsRespondent')]
    #[ORM\JoinColumn(name: 'respondent_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
    ])]
    private ?User $respondent = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?Ticket $ticket = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?bool $ticketAppeal = null;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'appeals', cascade: ['all'])]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $appealImages;

    /**
     * @var Collection<int, AppealMessage>
     */
    #[ORM\OneToMany(targetEntity: AppealMessage::class, mappedBy: 'appeal', cascade: ['persist', 'remove'])]
    #[Groups([
        'appealsSupport:read',
    ])]
    #[SerializedName('messages')]
    #[ApiProperty(writable: false)]
    private Collection $appealMessages;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCompliantReason(): ?string
    {
        return $this->compliantReason;
    }

    public function setCompliantReason(?string $compliantReason): static
    {
        $this->compliantReason = $compliantReason;

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

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

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

    public function getTicketAppeal(): ?bool
    {
        return $this->ticketAppeal;
    }

    public function setTicketAppeal(?bool $ticketAppeal): void
    {
        $this->ticketAppeal = $ticketAppeal;
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

    /**
     * @return Collection<int, AppealImage>
     */
    public function getAppealImages(): Collection
    {
        return $this->appealImages;
    }

    public function addAppealImage(AppealImage $appealImage): static
    {
        if (!$this->appealImages->contains($appealImage)) {
            $this->appealImages->add($appealImage);
            $appealImage->setAppeals($this);
        }

        return $this;
    }

    public function removeAppealImage(AppealImage $appealImage): static
    {
        if ($this->appealImages->removeElement($appealImage)) {
            // set the owning side to null (unless already changed)
            if ($appealImage->getAppeals() === $this) {
                $appealImage->setAppeals(null);
            }
        }

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): void
    {
        $this->title = $title;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(?string $type): void
    {
        $this->type = $type;
    }

    public function getSupportReason(): ?string
    {
        return $this->supportReason;
    }

    public function setSupportReason(?string $supportReason): void
    {
        $this->supportReason = $supportReason;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): void
    {
        $this->status = $status;
    }

    public function getPriority(): ?string
    {
        return $this->priority;
    }

    public function setPriority(?string $priority): void
    {
        $this->priority = $priority;
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

    /**
     * @return Collection<int, AppealMessage>
     */
    public function getAppealMessages(): Collection
    {
        return $this->appealMessages;
    }

    public function addAppealMessage(AppealMessage $appealMessage): static
    {
        if (!$this->appealMessages->contains($appealMessage)) {
            $this->appealMessages->add($appealMessage);
            $appealMessage->setAppeal($this);
        }

        return $this;
    }

    public function removeAppealMessage(AppealMessage $appealMessage): static
    {
        if ($this->appealMessages->removeElement($appealMessage)) {
            // set the owning side to null (unless already changed)
            if ($appealMessage->getAppeal() === $this) {
                $appealMessage->setAppeal(null);
            }
        }

        return $this;
    }
}
