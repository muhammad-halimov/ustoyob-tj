<?php

namespace App\Entity\Review;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Image\AbstractImage;
use App\Repository\Review\ReviewImageRepository;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: ReviewImageRepository::class)]
class ReviewImage extends AbstractImage
{
    public function __toString(): string
    {
        return $this->image ?? "Review Image #$this->id";
    }

    #[Vich\UploadableField(mapping: 'review_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    #[ORM\ManyToOne(inversedBy: 'reviewImages')]
    #[Ignore]
    private ?Review $reviews = null;

    #[Groups([
        'reviews:read',
        'reviewsClient:read',
    ])]
    public function getId(): ?int
    {
        return $this->id;
    }

    #[Groups([
        'reviews:read',
        'reviewsClient:read',
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

    public function getReviews(): ?Review
    {
        return $this->reviews;
    }

    public function setReviews(?Review $reviews): static
    {
        $this->reviews = $reviews;

        return $this;
    }
}
