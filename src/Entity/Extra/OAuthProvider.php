<?php

namespace App\Entity\Extra;

use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\UserOAuthProviderRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: UserOAuthProviderRepository::class)]
#[ORM\Table(name: 'user_oauth_provider')]
#[ORM\UniqueConstraint(name: 'uq_provider_id', columns: ['provider', 'provider_id'])]
#[ORM\HasLifecycleCallbacks]
class OAuthProvider
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->provider ?? "OAuth provider ID $this->providerId";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([G::USERS_ME])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'oauthProviders')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** google | facebook | instagram | telegram */
    #[ORM\Column(length: 50)]
    #[Groups([G::USERS_ME])]
    private string $provider;

    #[ORM\Column(type: 'text')]
    #[Groups([G::USERS_ME])]
    private string $providerId;

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

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function setProvider(string $provider): static
    {
        $this->provider = $provider;
        return $this;
    }

    public function getProviderId(): string
    {
        return $this->providerId;
    }

    public function setProviderId(string $providerId): static
    {
        $this->providerId = $providerId;
        return $this;
    }
}
