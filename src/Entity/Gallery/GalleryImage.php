<?php

namespace App\Entity\Gallery;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Image\AbstractImage;
use App\Repository\GalleryImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: GalleryImageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
class GalleryImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "Gallery Image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'gallery_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'userServiceGalleryItems')]
    #[Ignore]
    private ?Gallery $gallery = null;

    #[Groups(['galleries:read'])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups(['galleries:read'])]
    public function getImage(): ?string
    {
        return $this->image;
    }

    #[Groups(['galleries:read'])]
    public function getPosition(): int
    {
        return $this->position;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): static
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
