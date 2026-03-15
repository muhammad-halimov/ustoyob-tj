<?php

namespace App\Entity\Appeal;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Image\AbstractImage;
use App\Repository\Appeal\AppealImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: AppealImageRepository::class)]
class AppealImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "Appeal image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'images')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    #[Ignore]
    private ?Appeal $appeal = null;

    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read'])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups(['appeal:read', 'appeal:chat:read', 'appeal:ticket:read'])]
    #[ApiProperty(writable: false)]
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

    public function getAppeal(): ?Appeal
    {
        return $this->appeal;
    }

    public function setAppeal(?Appeal $appeal): static
    {
        $this->appeal = $appeal;
        return $this;
    }
}
