<?php

namespace App\Entity\User;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\SocialNetworkRepository;
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

    const NETWORKS = [
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
        'social:read',
        'masters:read',
        'clients:read',

        'user:public:read',
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'socialNetworks')]
    #[Ignore]
    private ?User $user = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'social:read',
        'masters:read',
        'clients:read',

        'user:public:read',
    ])]
    private ?string $network = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read',
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
