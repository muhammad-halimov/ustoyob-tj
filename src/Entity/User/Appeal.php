<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(),
        new Post(security:
            "is_granted('ROLE_ADMIN') or
             is_granted('ROLE_CLIENT') or
             is_granted('ROLE_MASTER')",
        ),
        new Patch(security:
            "is_granted('ROLE_ADMIN') or
             is_granted('ROLE_CLIENT') or
             is_granted('ROLE_MASTER')",
        ),
        new Delete(security:
            "is_granted('ROLE_ADMIN') or
             is_granted('ROLE_CLIENT') or
             is_granted('ROLE_MASTER')",
        )
    ],
    normalizationContext: [
        'groups' => ['appeals:read'],
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
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
    ])]
    private ?string $reason = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appeals:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
    ])]
    private ?User $user = null;

    #[ORM\ManyToOne(inversedBy: 'appeals')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
    ])]
    private ?Ticket $ticket = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'appeals:read',
    ])]
    private ?bool $ticketAppeal = null;

    #[ORM\ManyToOne(inversedBy: 'appealsRespondent')]
    #[ORM\JoinColumn(name: 'respondent_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeals:read',
    ])]
    private ?User $respondent = null;

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
}
