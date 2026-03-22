<?php

namespace App\Entity\Trait;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait TitleTrait
{
    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'user:public:read',

        'occupations:read',
        'categories:read',
        'units:read',

        'masterTickets:read',
        'clientTickets:read',

        'favorites:read',
        'blackLists:read',
        'legals:read',

        'reviews:read',

        'appeal:ticket:read',
        'appeal:chat:read',

        'chats:read',

        'techSupport:read',

        'districts:read',
        'provinces:read',
        'cities:read',

        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
        'appeal:review:read',
        'appeal:user:read',

        'appeal:reason:read',

        'districts:read',
        'provinces:read',
        'cities:read',
    ])]
    private ?string $title = null;

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;

        return $this;
    }
}
