<?php

namespace App\Entity\Appeal;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Appeal\AppealImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\HttpFoundation\File\File;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: AppealImageRepository::class)]
class AppealImage
{
    use UpdatedAtTrait, CreatedAtTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeals:read',
    ])]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'appeal_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeals:read',
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'appealImages')]
    private ?Appeal $appeals = null;

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

    public function getAppeals(): ?Appeal
    {
        return $this->appeals;
    }

    public function setAppeals(?Appeal $appeals): static
    {
        $this->appeals = $appeals;

        return $this;
    }
}
