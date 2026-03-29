<?php

namespace App\Entity\User;

use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\User\SocialNetworkRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\Entity(repositoryClass: SocialNetworkRepository::class)]
#[ORM\HasLifecycleCallbacks]
class SocialNetwork
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->network ?? "Social Network #$this->id";
    }

    const array NETWORKS = [
        'Instagram' => 'instagram',
        'Telegram' => 'telegram',
        'WhatsApp' => 'whatsapp',
        'Facebook' => 'facebook',
        'VK' => 'vk',
        'Youtube' => 'youtube',
        'Site' => 'site',
        'Viber' => 'viber',
        'Imo' => 'imo',
        'Twitter' => 'twitter',
        'LinkedIn' => 'linkedin',
        'Google' => 'google',
        'WeChat' => 'wechat',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::SOCIAL,
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'socialNetworks')]
    #[Ignore]
    private ?User $user = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::SOCIAL,
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?string $network = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?string $handle = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getNetwork(): ?string
    {
        return $this->network;
    }

    public function setNetwork(?string $network): static
    {
        $this->network = $network;

        return $this;
    }

    public function getHandle(): ?string
    {
        return $this->handle;
    }

    public function setHandle(?string $handle): static
    {
        $this->handle = $handle;

        return $this;
    }
}
