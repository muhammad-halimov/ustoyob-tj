<?php

namespace App\Entity\Ticket;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\TicketImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: TicketImageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
class TicketImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->image ?? "Ticket Image #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'ticketImages:read',

        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read',
        'chats:read',
    ])]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'ticket_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'ticketImages:read',

        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read',
        'chats:read',
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'userTicketImages')]
    #[Ignore]
    private ?Ticket $userTicket = null;

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

    public function getUserTicket(): ?Ticket
    {
        return $this->userTicket;
    }

    public function setUserTicket(?Ticket $userTicket): static
    {
        $this->userTicket = $userTicket;

        return $this;
    }
}
