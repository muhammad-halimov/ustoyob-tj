<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\User\PersonalFavoriteFilterController;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: FavoriteRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/favorites/me',
            controller: PersonalFavoriteFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/favorites',
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete( #TODO Удалить из массива, не саму фаворитку
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            security:
            "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
    ],
    normalizationContext: [
        'groups' => ['favorites:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Favorite
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __construct()
    {
        $this->favoriteMasters = new ArrayCollection();
    }

    public function __toString(): string
    {
        return "Favorite #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'favorites:read'
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'favorites')]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'favorites:read'
    ])]
    private ?User $user = null;

    /**
     * @var Collection<int, User>
     */
    #[ORM\OneToMany(targetEntity: User::class, mappedBy: 'favorite')]
    #[Groups([
        'favorites:read'
    ])]
    #[SerializedName('masters')]
    private Collection $favoriteMasters;

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

    /**
     * @return Collection<int, User>
     */
    public function getFavoriteMasters(): Collection
    {
        return $this->favoriteMasters;
    }

    public function addFavoriteMaster(User $favoriteMaster): static
    {
        if (!$this->favoriteMasters->contains($favoriteMaster)) {
            $this->favoriteMasters->add($favoriteMaster);
            $favoriteMaster->setFavorite($this);
        }

        return $this;
    }

    public function removeFavoriteMaster(User $favoriteMaster): static
    {
        if ($this->favoriteMasters->removeElement($favoriteMaster)) {
            // set the owning side to null (unless already changed)
            if ($favoriteMaster->getFavorite() === $this) {
                $favoriteMaster->setFavorite(null);
            }
        }

        return $this;
    }
}
