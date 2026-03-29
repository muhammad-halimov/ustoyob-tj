<?php

namespace App\Entity\Gallery;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Gallery\Gallery\ApiGetMyGalleriesController;
use App\Controller\Api\CRUD\PATCH\Gallery\Gallery\ApiPatchGalleryController;
use App\Controller\Api\CRUD\POST\Gallery\Gallery\ApiPostGalleryController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Dto\Image\ImageInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\UpdatedAtTrait;
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
        new Get(
            uriTemplate: '/galleries/me',
            controller: ApiGetMyGalleriesController::class,
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
            read: false,
        ),
        new GetCollection(
            uriTemplate: '/galleries',
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
        ),
        new Post(
            uriTemplate: '/galleries',
            controller: ApiPostGalleryController::class,
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
            input: false,
        ),
        new Post(
            uriTemplate: '/galleries/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchGalleryController::class,
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
        ),
        new Delete(
            uriTemplate: '/galleries/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => G::OPS_GALLERIES, 'skip_null_values' => false],
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
        G::GALLERIES,
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'galleries')]
    #[Groups([
        G::GALLERIES,
    ])]
    #[ApiProperty(writable: false)]
    private ?User $user = null;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'gallery', cascade: ['all'])]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::GALLERIES,
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
