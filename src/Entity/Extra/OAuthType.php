<?php

namespace App\Entity\Extra;

use App\Entity\User;
use App\Repository\User\OAuthTypeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: OAuthTypeRepository::class)]
class OAuthType
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class, inversedBy: 'oauthType')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $googleId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $telegramId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $vkId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $instagramId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $facebookId = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getGoogleId(): ?string
    {
        return $this->googleId;
    }

    public function setGoogleId(?string $googleId): static
    {
        $this->googleId = $googleId;

        return $this;
    }

    public function getTelegramId(): ?string
    {
        return $this->telegramId;
    }

    public function setTelegramId(?string $telegramId): static
    {
        $this->telegramId = $telegramId;

        return $this;
    }

    public function getVkId(): ?string
    {
        return $this->vkId;
    }

    public function setVkId(?string $vkId): static
    {
        $this->vkId = $vkId;

        return $this;
    }

    public function getInstagramId(): ?string
    {
        return $this->instagramId;
    }

    public function setInstagramId(?string $instagramId): static
    {
        $this->instagramId = $instagramId;

        return $this;
    }

    public function getFacebookId(): ?string
    {
        return $this->facebookId;
    }

    public function setFacebookId(?string $facebookId): static
    {
        $this->facebookId = $facebookId;

        return $this;
    }

    /**
     * Проверяет, есть ли хотя бы один привязанный OAuth provider
     */
    public function hasAnyProvider(): bool
    {
        return $this->googleId !== null
            || $this->telegramId !== null
            || $this->vkId !== null
            || $this->instagramId !== null
            || $this->facebookId !== null;
    }

    /**
     * Возвращает список активных провайдеров
     */
    public function getActiveProviders(): array
    {
        $providers = [];

        if ($this->googleId !== null) {
            $providers[] = 'google';
        }
        if ($this->telegramId !== null) {
            $providers[] = 'telegram';
        }
        if ($this->vkId !== null) {
            $providers[] = 'vk';
        }
        if ($this->instagramId !== null) {
            $providers[] = 'instagram';
        }
        if ($this->facebookId !== null) {
            $providers[] = 'facebook';
        }

        return $providers;
    }
}
