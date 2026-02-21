<?php

namespace App\Entity\Traits;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[Orm\HasLifecycleCallbacks]
trait CreatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'legals:read',
        'chats:read',
    ])]
    protected DateTime $createdAt;

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    #[ORM\PrePersist]
    public function setCreatedAt(): void
    {
        $this->createdAt = new DateTime();
    }
}
