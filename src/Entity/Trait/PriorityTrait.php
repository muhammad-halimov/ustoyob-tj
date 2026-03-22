<?php

namespace App\Entity\Trait;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait PriorityTrait
{
    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups([
        'masters:read',

        'occupations:read',
        'categories:read',
        'units:read',

        'masterTickets:read',
        'clientTickets:read',

        'favorites:read',

        'user:public:read',

        'techSupport:read',
    ])]
    private ?int $priority = null;

    public function getPriority(): ?int
    {
        return $this->priority;
    }

    public function setPriority(?int $priority): self
    {
        $this->priority = $priority;

        return $this;
    }
}
