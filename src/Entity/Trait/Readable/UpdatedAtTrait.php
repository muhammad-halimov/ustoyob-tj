<?php

namespace App\Entity\Trait\Readable;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait UpdatedAtTrait
{
    #[ORM\Column(type: 'datetime', nullable: true)]
    #[Groups([
        G::USERS_ME,
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::LEGALS,
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
        G::TECH_SUPPORT_MESSAGES,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
    ])]
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
