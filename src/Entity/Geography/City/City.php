<?php

namespace App\Entity\Geography\City;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Controller\Api\Filter\Geography\City\CitiesFilterController;
use App\Controller\Api\Filter\Geography\City\CityFilterController;
use App\Entity\Geography\AddressComponent;
use App\Entity\Geography\Province;
use App\Repository\CityRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: CityRepository::class)]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/cities/{id}',
            requirements: ['id' => '\d+'],
            controller: CityFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/cities',
            controller: CitiesFilterController::class,
        ),
    ],
    normalizationContext: [
        'groups' => ['cities:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class City extends AddressComponent
{
    public function __construct()
    {
        $this->suburbs = new ArrayCollection();
    }

    #[Vich\UploadableField(mapping: 'city_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[ApiProperty(writable: false)]
    #[Groups([
        'cities:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',
        'districts:read',
        'masters:read',
    ])]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'cities')]
    #[ORM\JoinColumn(name: 'province_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'cities:read',
        'districts:read',
    ])]
    private ?Province $province = null;

    /**
     * @var Collection<int, Suburb>
     */
    #[ORM\OneToMany(targetEntity: Suburb::class, mappedBy: 'cities', cascade: ['all'])]
    #[Groups([
        'cities:read',
        'provinces:read',
        'districts:read',
    ])]
    private Collection $suburbs;

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

    public function getProvince(): ?Province
    {
        return $this->province;
    }

    public function setProvince(?Province $province): static
    {
        $this->province = $province;

        return $this;
    }

    /**
     * @return Collection<int, Suburb>
     */
    public function getSuburbs(): Collection
    {
        return $this->suburbs;
    }

    public function addSuburb(Suburb $suburb): static
    {
        if (!$this->suburbs->contains($suburb)) {
            $this->suburbs->add($suburb);
            $suburb->setCities($this);
        }

        return $this;
    }

    public function removeSuburb(Suburb $suburb): static
    {
        if ($this->suburbs->removeElement($suburb)) {
            // set the owning side to null (unless already changed)
            if ($suburb->getCities() === $this) {
                $suburb->setCities(null);
            }
        }

        return $this;
    }
}
