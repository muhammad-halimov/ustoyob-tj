<?php

namespace App\Entity\Gallery;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\GalleryImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: GalleryImageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
class GalleryImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->image ?? "Gallery Image #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'galleries:read',
    ])]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'gallery_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'galleries:read',
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'userServiceGalleryItems')]
    #[Ignore]
    private ?Gallery $gallery = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;

        return $this;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): self
    {
        $this->imageFile = $imageFile;
        if (null !== $imageFile) {
            $this->updatedAt = new DateTime();
        }

        return $this;
    }

    public function getGallery(): ?Gallery
    {
        return $this->gallery;
    }

    public function setGallery(?Gallery $gallery): static
    {
        $this->gallery = $gallery;

        return $this;
    }
}
