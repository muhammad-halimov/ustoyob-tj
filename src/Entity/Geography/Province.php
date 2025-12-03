<?php
namespace App\Entity\Geography;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Geography\City\City;
use App\Entity\Geography\District\District;
use App\Repository\ProvinceRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProvinceRepository::class)]
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
class Province extends AddressComponent
{
    public const PROVINCES = [
        'Душанбе' => 'Лушанбе',
        'ГРРП' => 'ГРРП',
        'ГБАО' => 'ГБАО',
        'Согдийская область' => 'Согдийская область',
        'Хатлонская область' => 'Хатлонская область',
    ];

    /**
     * @var Collection<int, City>
     */
    #[ORM\OneToMany(targetEntity: City::class, mappedBy: 'province', cascade: ['persist'])]
    private Collection $cities;

    /**
     * @var Collection<int, District>
     */
    #[ORM\OneToMany(targetEntity: District::class, mappedBy: 'province', cascade: ['persist'])]
    private Collection $districts;

    public function __construct()
    {
        $this->cities = new ArrayCollection();
        $this->districts = new ArrayCollection();
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
    public function getDistricts(): Collection
    {
        return $this->districts;
    }

    public function addDistrict(District $district): static
    {
        if (!$this->districts->contains($district)) {
            $this->districts->add($district);
            $district->setProvince($this);
        }

        return $this;
    }

    public function removeDistrict(District $district): static
    {
        if ($this->districts->removeElement($district)) {
            // set the owning side to null (unless already changed)
            if ($district->getProvince() === $this) {
                $district->setProvince(null);
            }
        }

        return $this;
    }
}
