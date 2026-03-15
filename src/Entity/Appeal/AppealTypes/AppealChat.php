<?php

namespace App\Entity\Appeal\AppealTypes;

use App\Entity\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Repository\Appeal\AppealMessageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealMessageRepository::class)]
class AppealChat extends Appeal
{
    public function __construct()
    {
        parent::__construct();
        $this->setType('chat');
    }

    public function __toString(): string
    {
        $title = $this->getTitle();
        $id    = $this->getId();
        return $title ? "Жалоба на чат #$id: $title" : "Жалоба на чат #$id";
    }

    #[ORM\ManyToOne(inversedBy: 'appealChats')]
    #[Groups(['appeal:chat:read'])]
    private ?Chat $chat = null;

    public function getChat(): ?Chat
    {
        return $this->chat;
    }

    public function setChat(?Chat $chat): static
    {
        $this->chat = $chat;
        return $this;
    }
}
