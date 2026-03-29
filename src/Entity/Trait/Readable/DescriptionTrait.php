<?php

namespace App\Entity\Trait\Readable;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait DescriptionTrait
{
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::OCCUPATIONS,
        G::CATEGORIES,
        G::UNITS,

        G::LEGALS,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,

        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,

        G::APPEAL_REASON,
    ])]
    private ?string $description = null;

    public function getDescription(): ?string
    {
        return strip_tags($this->description);
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }
}
