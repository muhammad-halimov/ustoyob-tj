<?php

namespace App\Entity\Ticket;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Image\AbstractImage;
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
class TicketImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "Ticket Image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'ticket_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'userTicketImages')]
    #[Ignore]
    private ?Ticket $userTicket = null;

    #[Groups([
        'ticketImages:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read',
        'chats:read',
    ])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups([
        'ticketImages:read',
        'reviews:read',
        'favorites:read',
        'appeal:ticket:read',
        'appeal:chat:read',
        'blackLists:read',
        'chats:read',
    ])]
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
