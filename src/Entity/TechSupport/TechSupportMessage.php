<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Appeal\DeleteTechSupportMessageController;
use App\Controller\Api\CRUD\Appeal\PostTechSupportMessageController;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportMessageRepository;
use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: TechSupportMessageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/tech-support-messages',
            controller: PostTechSupportMessageController::class,
            security:
            "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/tech-support-messages/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete(
            uriTemplate: '/tech-support-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: DeleteTechSupportMessageController::class,
        )
    ],
    normalizationContext: [
        'groups' => ['techSupportMessages:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class TechSupportMessage
{
    public function __toString(): string
    {
        return $this->text ?? "TS message #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    private ?string $text = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportMessages')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportMessages')]
    #[ORM\JoinColumn(name: 'tech_support_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupportMessages:read',
    ])]
    private ?TechSupport $techSupport = null;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getTechSupport(): ?TechSupport
    {
        return $this->techSupport;
    }

    public function setTechSupport(?TechSupport $techSupport): static
    {
        $this->techSupport = $techSupport;

        return $this;
    }
}
