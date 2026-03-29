<?php

namespace App\Entity\Trait\NonReadable;

use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

trait CreatedAtTrait
{
    #[ORM\Column(type: 'datetime_immutable', nullable: false)]
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
