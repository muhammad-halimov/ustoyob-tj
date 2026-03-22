<?php

namespace App\Entity\Trait;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait DescriptionTrait
{
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'user:public:read',
        'masters:read',
        'clients:read',

        'occupations:read',
        'categories:read',
        'units:read',

        'masterTickets:read',
        'clientTickets:read',

        'favorites:read',
        'legals:read',

        'techSupportMessages:read',
        'techSupport:read',

        'chats:read',
        'chatMessages:read',

        'reviews:read',
        'reviewsClient:read',

        'districts:read',
        'provinces:read',
        'cities:read',

        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
        'appeal:review:read',
        'appeal:user:read',

        'appeal:reason:read',
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
