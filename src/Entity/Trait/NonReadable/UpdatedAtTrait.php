<?php

namespace App\Entity\Trait\NonReadable;

use DateTime;
use Doctrine\ORM\Mapping as ORM;

trait UpdatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: true)]
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
