<?php

namespace App\Entity\Geography\City;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Controller\Api\Filter\Translation\TranslationSearchFilter;
use App\Entity\Geography\Abstract\AddressComponent;
use App\Entity\Geography\Province\Province;
use App\Repository\Geography\City\CityRepository;
use App\State\Localization\Geography\CityLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: CityRepository::class)]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/cities/{id}',
            requirements: ['id' => '\d+'],
            provider: CityLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/cities',
            provider: CityLocalizationProvider::class,
        ),
    ],
    normalizationContext: [
        'groups' => ['cities:read'],
        'skip_null_values' => false,
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: [
    'province.id' => 'exact',
    'suburbs.id'  => 'exact',
])]
#[ApiFilter(TranslationSearchFilter::class, properties: [
    'title'          => 'partial',
    'description'    => 'partial',
    'province.title' => 'partial',
    'suburbs.title'  => 'partial',
])]
class City extends AddressComponent
{
    public function __construct()
    {
        $this->suburbs = new ArrayCollection();
    }

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
