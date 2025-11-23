<?php

namespace App\Entity\Geography;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\CityRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: CityRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/cities/{id}',
            requirements: ['id' => '\d+'],
        ),
        new GetCollection(
            uriTemplate: '/cities',
        ),
    ],
    normalizationContext: [
        'groups' => ['cities:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class City
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->title ?? "City #$this->id";
    }

    public function __construct()
    {
        $this->districts = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'cities:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'districts:read',
        'masters:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'cities:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'districts:read',
        'masters:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'cities:read',
    ])]
    private ?string $description = null;

    #[Vich\UploadableField(mapping: 'city_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'cities:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'districts:read',
        'masters:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

    /**
     * @var Collection<int, District>
     */
    #[ORM\OneToMany(targetEntity: District::class, mappedBy: 'city', cascade: ['persist'], orphanRemoval: false)]
    #[Groups([
        'cities:read',
        'provinces:read',
    ])]
    #[ApiProperty(writable: false)]
    private Collection $districts;

    #[ORM\ManyToOne(inversedBy: 'cities')]
    #[Groups([
        'cities:read',
        'masterTickets:read',
        'clientTickets:read',
        'districts:read',
        'masters:read',
    ])]
    private ?Province $province = null;

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

    /**
     * @return Collection<int, District>
     */
    public function getDistricts(): Collection
    {
        return $this->districts;
    }

    public function addDistrict(District $district): static
    {
        if (!$this->districts->contains($district)) {
            $this->districts->add($district);
            $district->setCity($this);
        }

        return $this;
    }

    public function removeDistrict(District $district): static
    {
        if ($this->districts->removeElement($district)) {
            // set the owning side to null (unless already changed)
            if ($district->getCity() === $this) {
                $district->setCity(null);
            }
        }

        return $this;
    }

    public function getProvince(): ?Province
    {
        return $this->province;
    }

    public function setProvince(?Province $province): static
    {
        $this->province = $province;

        return $this;
    }
}
