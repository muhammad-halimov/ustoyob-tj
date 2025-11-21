<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;

use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\HttpFoundation\File\File;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: TechSupportImageRepository::class)]
class TechSupportImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->image ?? "TS image #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'techSupport:read',
    ])]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'techSupport:read',
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportImages')]
    #[Ignore]
    private ?TechSupport $techSupport = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportImages')]
    #[Groups([
        'techSupport:read',
    ])]
    private ?User $author = null;

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
