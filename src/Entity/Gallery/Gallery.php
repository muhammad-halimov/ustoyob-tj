<?php

namespace App\Entity\Gallery;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Gallery\PersonalGalleryFilterController;
use App\Controller\Api\CRUD\PATCH\Gallery\PatchGalleryController;
use App\Controller\Api\CRUD\POST\Gallery\PostGalleryController;
use App\Controller\Api\CRUD\POST\Image\UniversalImageUploadController;
use App\Dto\Image\ImageInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Gallery\GalleryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: GalleryRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/galleries/me',
            controller: PersonalGalleryFilterController::class,
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
        ),
        new GetCollection(
            uriTemplate: '/galleries',
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
        ),
        new Post(
            uriTemplate: '/galleries',
            controller: PostGalleryController::class,
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
            input: false,
        ),
        new Post(
            uriTemplate: '/galleries/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: UniversalImageUploadController::class,
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchGalleryController::class,
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
        ),
        new Delete(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => ['galleries:read'], 'skip_null_values' => false],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 (is_granted('ROLE_MASTER') and
                 object.getUser() == user)",
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: ['user'])]
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

    #[ORM\ManyToOne(inversedBy: 'galleries')]
    #[Groups([
        'galleries:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $user = null;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'gallery', cascade: ['all'])]
    #[ORM\OrderBy(['position' => 'ASC'])]
    #[Groups([
        'galleries:read',
    ])]
    private Collection $images;

    public function __construct()
    {
        $this->images = new ArrayCollection();
    }

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
     * @return Collection<int, MultipleImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setGallery($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getGallery() === $this) {
                $image->setGallery(null);
            }
        }

        return $this;
    }
}
