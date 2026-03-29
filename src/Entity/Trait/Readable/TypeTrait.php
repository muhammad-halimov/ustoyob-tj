<?php

namespace App\Entity\Trait\Readable;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait TypeTrait
{
    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::LEGALS,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
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
