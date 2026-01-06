<?php

namespace App\Entity\Appeal\AppealTypes;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Appeal\AppealMessageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: AppealMessageRepository::class)]
#[ORM\HasLifecycleCallbacks]
class AppealTicket
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string
    {
        return $this->title
            ? "Жалоба на услугу/объявление #$this->id: $this->title"
            : "Жалоба на услугу/объявление #$this->id";
    }

    public const array COMPLAINTS = [
        'Опоздание/Отсутствие' => 'lateness',
        'Плохое качество' => 'bad_quality',
        'Повреждения имущества' => 'property_damage',
        'Завышение стоимости' => 'overpricing',
        'Непрофессионализм' => 'unprofessionalism',
        'Мошенничество' => 'fraud',
        'Расизм/Нацизм/Ксенофобия' => 'racism_nazism_xenophobia',
        'Другое' => 'other',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?string $description = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?string $reason = null;

    #[ORM\ManyToOne(inversedBy: 'appealTicket')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?Ticket $ticket = null;

    #[ORM\ManyToOne(inversedBy: 'appealTickets')]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'appealTicketsAsRespondent')]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?User $respondent = null;

    #[ORM\ManyToOne(inversedBy: 'appealTicket')]
    #[Ignore]
    private ?Appeal $appeal = null;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'appealTicket', cascade: ['all'])]
    #[Groups([
        'appeal:ticket:read',
    ])]
    #[ApiProperty(writable: false)]
    #[SerializedName('images')]
    private Collection $appealTicketImages;

    public function __construct()
    {
        $this->appealTicketImages = new ArrayCollection();
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

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

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

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;
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

    public function getAppeal(): ?Appeal
    {
        return $this->appeal;
    }

    public function setAppeal(?Appeal $appeal): static
    {
        $this->appeal = $appeal;

        return $this;
    }

    /**
     * @return Collection<int, AppealImage>
     */
    public function getAppealTicketImages(): Collection
    {
        return $this->appealTicketImages;
    }

    public function addAppealTicketImage(AppealImage $appealTicketImage): static
    {
        if (!$this->appealTicketImages->contains($appealTicketImage)) {
            $this->appealTicketImages->add($appealTicketImage);
            $appealTicketImage->setAppealTicket($this);
        }

        return $this;
    }

    public function removeAppealTicketImage(AppealImage $appealTicketImage): static
    {
        if ($this->appealTicketImages->removeElement($appealTicketImage)) {
            // set the owning side to null (unless already changed)
            if ($appealTicketImage->getAppealTicket() === $this) {
                $appealTicketImage->setAppealTicket(null);
            }
        }

        return $this;
    }
}
