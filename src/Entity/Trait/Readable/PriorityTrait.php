<?php

namespace App\Entity\Trait\Readable;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait PriorityTrait
{
    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::OCCUPATIONS,
        G::CATEGORIES,
        G::UNITS,

        G::FAVORITES,
        G::BLACK_LISTS,
        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::TECH_SUPPORT,

        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
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
