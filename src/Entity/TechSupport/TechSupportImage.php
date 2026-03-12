<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Image\AbstractImage;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: TechSupportImageRepository::class)]
class TechSupportImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "TS image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'tech_support_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportImages')]
    #[Ignore]
    private ?TechSupport $techSupport = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportImages')]
    #[Groups([
        'techSupport:read',
    ])]
    private ?User $author = null;

    #[Groups([
        'techSupport:read',
    ])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups([
        'techSupport:read',
    ])]
    public function getImage(): ?string
    {
        return $this->image;
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

    public function getTechSupport(): ?TechSupport
    {
        return $this->techSupport;
    }

    public function setTechSupport(?TechSupport $techSupport): static
    {
        $this->techSupport = $techSupport;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }
}
