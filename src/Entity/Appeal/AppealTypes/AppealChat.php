<?php

namespace App\Entity\Appeal\AppealTypes;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\Chat\Chat;
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
class AppealChat
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string
    {
        return $this->title
            ? "Жалоба на чат #$this->id: $this->title"
            : "Жалоба на чат #$this->id";
    }

    public const array COMPLAINTS = [
        'Оскорбление/Маты' => 'offend',
        'Грубая лексика' => 'rude_language',
        'Мошенничество' => 'fraud',
        'Расизм/Нацизм/Ксенофобия' => 'racism_nazism_xenophobia',
        'Другое' => 'other',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?string $description = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?string $reason = null;

    #[ORM\ManyToOne(inversedBy: 'appealChats')]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?Chat $chat = null;

    #[ORM\ManyToOne(inversedBy: 'appealChats')]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?Ticket $ticket = null;

    #[ORM\ManyToOne(inversedBy: 'appealChats')]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'appealChatsAsRespondent')]
    #[Groups([
        'appeal:chat:read',
    ])]
    private ?User $respondent = null;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'appealChat', cascade: ['all'])]
    #[Groups([
        'appeal:chat:read',
    ])]
    #[ApiProperty(writable: false)]
    #[SerializedName('images')]
    private Collection $appealChatImages;

    #[ORM\ManyToOne(inversedBy: 'appealChat')]
    #[Ignore]
    private ?Appeal $appeal = null;

    public function __construct()
    {
        $this->appealChatImages = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): AppealChat
    {
        $this->reason = $reason;
        return $this;
    }

    public function getChat(): ?Chat
    {
        return $this->chat;
    }

    public function setChat(?Chat $chat): static
    {
        $this->chat = $chat;

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

    /**
     * @return Collection<int, AppealImage>
     */
    public function getAppealChatImages(): Collection
    {
        return $this->appealChatImages;
    }

    public function addAppealChatImage(AppealImage $appealChatImage): static
    {
        if (!$this->appealChatImages->contains($appealChatImage)) {
            $this->appealChatImages->add($appealChatImage);
            $appealChatImage->setAppealChat($this);
        }

        return $this;
    }

    public function removeAppealChatImage(AppealImage $appealChatImage): static
    {
        if ($this->appealChatImages->removeElement($appealChatImage)) {
            // set the owning side to null (unless already changed)
            if ($appealChatImage->getAppealChat() === $this) {
                $appealChatImage->setAppealChat(null);
            }
        }

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

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

        return $this;
    }
}
