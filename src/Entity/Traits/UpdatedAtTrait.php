<?php

namespace App\Entity\Traits;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait UpdatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: true)]
    #[Groups([
        'legals:read',
        'chats:read',

        'users:me:read'
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
