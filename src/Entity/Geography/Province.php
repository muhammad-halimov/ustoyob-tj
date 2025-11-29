<?php

namespace App\Entity\Geography;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Geography\City\City;
use App\Entity\Geography\District\District;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\ProvinceRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: ProvinceRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/provinces/{id}',
            requirements: ['id' => '\d+'],
        ),
        new GetCollection(
            uriTemplate: '/provinces',
        ),
    ],
    normalizationContext: [
        'groups' => ['provinces:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Province
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->province ?? "Province #$this->id";
    }

    public function __construct()
    {
        $this->cities = new ArrayCollection();
        $this->district = new ArrayCollection();
    }

    public const PROVINCES = [
        'Душанбе' => 'Лушанбе',
        'ГРРП' => 'ГРРП',
        'ГБАО' => 'ГБАО',
        'Согдийская область' => 'Согдийская область',
        'Хатлонская область' => 'Хатлонская область',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'cities:read',
        'districts:read',
        'masters:read',
        'districts:read'
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'cities:read',
        'districts:read',
        'masters:read',
        'districts:read'
    ])]
    #[SerializedName('title')]
    private ?string $province = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups([
        'provinces:read',
    ])]
    private ?string $description = null;

    /**
     * @var Collection<int, City>
     */
    #[ORM\OneToMany(targetEntity: City::class, mappedBy: 'province')]
    #[Groups([
        'provinces:read',
    ])]
    private Collection $cities;

    /**
     * @var Collection<int, District>
     */
    #[ORM\OneToMany(targetEntity: District::class, mappedBy: 'province')]
    #[Groups([
        'provinces:read',
    ])]
    private Collection $district;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProvince(): ?string
    {
        return $this->province;
    }

    public function setProvince(?string $province): static
    {
        $this->province = $province;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): Province
    {
        $this->description = $description;
        return $this;
    }

    /**
     * @return Collection<int, City>
     */
    public function getCities(): Collection
    {
        return $this->cities;
    }

    public function addCity(City $city): static
    {
        if (!$this->cities->contains($city)) {
            $this->cities->add($city);
            $city->setProvince($this);
        }

        return $this;
    }

    public function removeCity(City $city): static
    {
        if ($this->cities->removeElement($city)) {
            // set the owning side to null (unless already changed)
            if ($city->getProvince() === $this) {
                $city->setProvince(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, District>
     */
    public function getDistrict(): Collection
    {
        return $this->district;
    }

    public function addDistrict(District $district): static
    {
        if (!$this->district->contains($district)) {
            $this->district->add($district);
            $district->setProvince($this);
        }

        return $this;
    }

    public function removeDistrict(District $district): static
    {
        if ($this->district->removeElement($district)) {
            // set the owning side to null (unless already changed)
            if ($district->getProvince() === $this) {
                $district->setProvince(null);
            }
        }

        return $this;
    }
}
