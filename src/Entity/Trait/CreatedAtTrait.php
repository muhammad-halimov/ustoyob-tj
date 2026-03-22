<?php

namespace App\Entity\Trait;

use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait CreatedAtTrait
{
    #[ORM\Column(type: 'datetime_immutable', nullable: false)]
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
    protected DateTimeImmutable $createdAt;

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    #[ORM\PrePersist]
    public function setCreatedAt(): void
    {
        $this->createdAt = new DateTimeImmutable();
    }
}
