<?php

namespace App\Entity\Gallery;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Gallery\PostGalleryController;
use App\Controller\Api\CRUD\Gallery\PostGalleryPhotoController;
use App\Controller\Api\Filter\Gallery\MasterGalleryFilterController;
use App\Controller\Api\Filter\Gallery\PersonalGalleryFilterController;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\GalleryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: GalleryRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/galleries/me',
            controller: PersonalGalleryFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')"
        ),
        new GetCollection(
            uriTemplate: '/galleries/master/{id}',
            requirements: ['id' => '\d+'],
            controller: MasterGalleryFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')"
        ),
        new Post(
            uriTemplate: '/galleries',
            controller: PostGalleryController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')",
        ),
        new Post(
            uriTemplate: '/galleries/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostGalleryPhotoController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')",
            input: AppealPhotoInput::class,
        ),
        new Patch(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 (is_granted('ROLE_MASTER') and
                 object.getUser() == user)",
        ),
        new Delete(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 (is_granted('ROLE_MASTER') and
                 object.getUser() == user)",
        ),
    ],
    normalizationContext: [
        'groups' => ['galleries:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Gallery
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return "Gallery #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'galleries:read',
    ])]
    private ?int $id = null;

    /**
     * @var Collection<int, GalleryImage>
     */
    #[ORM\OneToMany(targetEntity: GalleryImage::class, mappedBy: 'gallery', cascade: ['all'])]
    #[Groups([
        'galleries:read',
    ])]
    #[SerializedName('images')]
    private Collection $userServiceGalleryItems;

    #[ORM\ManyToOne(inversedBy: 'galleries')]
    #[Groups([
        'galleries:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $user = null;

    public function __construct()
    {
        $this->userServiceGalleryItems = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    /**
     * @return Collection<int, GalleryImage>
     */
    public function getUserServiceGalleryItems(): Collection
    {
        return $this->userServiceGalleryItems;
    }

    public function addUserServiceGalleryItem(GalleryImage $userServiceGalleryItem): static
    {
        if (!$this->userServiceGalleryItems->contains($userServiceGalleryItem)) {
            $this->userServiceGalleryItems->add($userServiceGalleryItem);
            $userServiceGalleryItem->setGallery($this);
        }

        return $this;
    }

    public function removeUserServiceGalleryItem(GalleryImage $userServiceGalleryItem): static
    {
        if ($this->userServiceGalleryItems->removeElement($userServiceGalleryItem)) {
            // set the owning side to null (unless already changed)
            if ($userServiceGalleryItem->getGallery() === $this) {
                $userServiceGalleryItem->setGallery(null);
            }
        }

        return $this;
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
}
