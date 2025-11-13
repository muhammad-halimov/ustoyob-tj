<?php

namespace App\Entity\Appeal;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\Appeal\PostAppealPhotoController;
use App\Controller\Api\Filter\Appeal\TicketAppealFilterController;
use App\Controller\Api\Filter\Appeal\UserAppealFilterController;
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
        new Get(
            uriTemplate: '/appeals/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/appeals/tickets',
            controller: TicketAppealFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/appeals/users',
            controller: UserAppealFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
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
        new Delete(
            uriTemplate: '/appeals/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        )
    ],
    normalizationContext: [
        'groups' => ['appeals:read', 'appealsTicket:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Appeal
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->reason ?? "Пустой заголовок жалобы";
    }

    public const REASONS = [
        'Опоздание/Отсутствие' => 'lateness',
        'Плохое качество' => 'bad quality',
        'Повреждения имущества' => 'property damage',
        'Завышение стоимости' => 'overpricing',
        'Непрофессионализм' => 'unprofessionalism',
        'Мошенничество' => 'fraud',
        'Расизм/Нацизм' => 'racism or nazism',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?string $reason = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
        'appealsTicket:read',
    ])]
    private ?User $user = null;

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

    #[ORM\ManyToOne(inversedBy: 'appealsRespondent')]
    #[ORM\JoinColumn(name: 'respondent_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
    ])]
    private ?User $respondent = null;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'appeals')]
    #[Groups([
        'appeals:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $appealImages;

    public function __construct()
    {
        $this->appealImages = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): static
    {
        $this->reason = $reason;

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

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
}
