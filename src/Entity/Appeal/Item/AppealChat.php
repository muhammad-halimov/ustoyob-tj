<?php

namespace App\Entity\Appeal\Item;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Repository\Appeal\AppealMessageRepository;
use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealMessageRepository::class)]
#[ORM\HasLifecycleCallbacks]
class AppealChat
{
    public function __toString(): string
    {
        return $this->text ?? "Appeal message #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appealMessages:read',
        'appealsSupport:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'appealMessages:read',
        'appealsSupport:read',
    ])]
    private ?string $text = null;

    #[ORM\ManyToOne(inversedBy: 'appealMessages')]
    #[ORM\JoinColumn(name: 'appeal_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appealMessages:read',
    ])]
    private ?Appeal $appeal = null;

    #[ORM\ManyToOne(inversedBy: 'appealMessages')]
    #[Groups([
        'appealMessages:read',
        'appealsSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'appealMessages:read',
        'appealsSupport:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'appealMessages:read',
        'appealsSupport:read',
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getText(): ?string
    {
        return $this->text;
    }

    public function setText(?string $text): static
    {
        $this->text = $text;

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

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    #[ORM\PrePersist]
    public function setCreatedAt(): void
    {
        $this->createdAt = new DateTime();
    }

    public function getUpdatedAt(): DateTime
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    #[ORM\PrePersist]
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new DateTime();
    }
}
