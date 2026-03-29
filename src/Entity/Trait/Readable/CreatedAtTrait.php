<?php

namespace App\Entity\Trait\Readable;

use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait CreatedAtTrait
{
    #[ORM\Column(type: 'datetime_immutable', nullable: false)]
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
