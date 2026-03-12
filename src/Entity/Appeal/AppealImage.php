<?php

namespace App\Entity\Appeal;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Image\AbstractImage;
use App\Repository\Appeal\AppealImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: AppealImageRepository::class)]
class AppealImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "Appeal image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'appealChatImages')]
    #[Ignore]
    private ?AppealChat $appealChat = null;

    #[ORM\ManyToOne(inversedBy: 'appealTicketImages')]
    #[Ignore]
    private ?AppealTicket $appealTicket = null;

    #[Groups(['appeal:ticket:read'])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups(['appeal:ticket:read'])]
    #[ApiProperty(writable: false)]
    public function getImage(): ?string
    {
        return $this->image;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): static
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
