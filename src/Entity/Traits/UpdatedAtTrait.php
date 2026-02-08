<?php

namespace App\Entity\Traits;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[Orm\HasLifecycleCallbacks]
trait UpdatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups(['legals:read'])]
    protected DateTime $updatedAt;

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
}
