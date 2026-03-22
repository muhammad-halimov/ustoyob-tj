<?php

namespace App\Entity\Trait;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait UpdatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: true)]
    #[Groups([
        'legals:read',
        'favorites:read',

        'chats:read',
        'chatMessages:read',

        'techSupport:read',
        'techSupportMessages:read',

        'reviews:read',
        'reviewsClient:read',

        'masterTickets:read',
        'clientTickets:read',

        'users:me:read',
    ])]
    protected ?DateTime $updatedAt = null;

    public function getUpdatedAt(): ?DateTime
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
