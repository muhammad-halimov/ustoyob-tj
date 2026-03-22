<?php

namespace App\Entity\Trait;

use Symfony\Component\Serializer\Attribute\Groups;
use Doctrine\ORM\Mapping as ORM;

trait PositionTrait
{
    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private int $position = 0;

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;
        return $this;
    }
}
