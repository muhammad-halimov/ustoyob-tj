<?php

namespace App\Entity\Trait;

use Symfony\Component\Serializer\Attribute\Groups;
use Doctrine\ORM\Mapping as ORM;

trait TypeTrait
{
    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'blackLists:read',
        'favorites:read',
        'legals:read',

        'reviews:read',
        'reviewsClient:read',

        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
        'appeal:review:read',
        'appeal:user:read',
    ])]
    private ?string $type = null;

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(?string $type): self
    {
        $this->type = $type;

        return $this;
    }
}
