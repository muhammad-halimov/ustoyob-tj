<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\OccupationRepository;
use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: OccupationRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/occupations/{id}',
            requirements: ['id' => '\d+'],
        ),
        new GetCollection(
            uriTemplate: '/occupations',
        ),
        new Post(
            uriTemplate: '/occupations',
        ),
        new Patch(
            uriTemplate: '/occupations/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')"
        ),
        new Delete(
            uriTemplate: '/occupations/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER')"
        )
    ],
    normalizationContext: [
        'groups' => ['occupations:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Occupation
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string
    {
        return $this->title ?? "Occupation ID: $this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'occupations:read'
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masters:read',
        'occupations:read'
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'occupations:read'
    ])]
    private ?string $description = null;

    #[Vich\UploadableField(mapping: 'occupation_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'occupations:read'
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'occupation')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $master = null;

    #[ORM\ManyToOne(inversedBy: 'occupation')]
    #[ORM\JoinColumn(name: 'education_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Education $education = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getMaster(): ?User
    {
        return $this->master;
    }

    public function setMaster(?User $master): static
    {
        $this->master = $master;

        return $this;
    }

    public function getEducation(): ?Education
    {
        return $this->education;
    }

    public function setEducation(?Education $education): static
    {
        $this->education = $education;

        return $this;
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
}
