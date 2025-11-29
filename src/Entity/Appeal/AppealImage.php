<?php

namespace App\Entity\Appeal;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Appeal\AppealImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

use Symfony\Component\Serializer\Attribute\Ignore;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\HttpFoundation\File\File;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: AppealImageRepository::class)]
class AppealImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->image ?? "Appeal image #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeal:ticket:read',
    ])]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:ticket:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'appealChatImages')]
    #[Ignore]
    private ?AppealChat $appealChat = null;

    #[ORM\ManyToOne(inversedBy: 'appealTicketImages')]
    #[Ignore]
    private ?AppealTicket $appealTicket = null;

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

    public function getAppealChat(): ?AppealChat
    {
        return $this->appealChat;
    }

    public function setAppealChat(?AppealChat $appealChat): static
    {
        $this->appealChat = $appealChat;

        return $this;
    }

    public function getAppealTicket(): ?AppealTicket
    {
        return $this->appealTicket;
    }

    public function setAppealTicket(?AppealTicket $appealTicket): static
    {
        $this->appealTicket = $appealTicket;

        return $this;
    }
}
