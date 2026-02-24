<?php

namespace App\Entity\Chat;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Chat\ChatImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\HttpFoundation\File\File;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: ChatImageRepository::class)]
class ChatImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->image ?? "Chat image #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'chatImages')]
    private ?ChatMessage $chatMessage = null;

    #[ORM\ManyToOne(inversedBy: 'chatImages')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    private ?User $author = null;

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    private ?string $image = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;

        return $this;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): self
    {
        $this->imageFile = $imageFile;
        if (null !== $imageFile) {
            $this->updatedAt = new DateTime();
        }

        return $this;
    }

    public function getChatMessage(): ?ChatMessage
    {
        return $this->chatMessage;
    }

    public function setChatMessage(?ChatMessage $chatMessage): static
    {
        $this->chatMessage = $chatMessage;

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
}
