<?php
namespace App\Entity\Geography\District;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Controller\Api\Filter\Translation\TranslationSearchFilter;
use App\Entity\Geography\Abstract\AddressComponent;
use App\Entity\Geography\Province\Province;
use App\Entity\Trait\Readable\G;
use App\Repository\Geography\District\DistrictRepository;
use App\State\Localization\Geography\DistrictLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: DistrictRepository::class)]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/districts/{id}',
            requirements: ['id' => '\d+'],
            provider: DistrictLocalizationProvider::class
        ),
        new GetCollection(
            uriTemplate: '/districts',
            provider: DistrictLocalizationProvider::class
        ),
    ],
    normalizationContext: ['groups' => G::OPS_DISTRICTS, 'skip_null_values' => false],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: [
    'province.id'          => 'exact',
    'communities.id'       => 'exact',
    'settlements.id'       => 'exact',
    'settlements.villages.id' => 'exact',
])]
#[ApiFilter(TranslationSearchFilter::class, properties: [
    'title'                      => 'partial',
    'description'                => 'partial',
    'province.title'             => 'partial',
    'communities.title'          => 'partial',
    'settlements.title'          => 'partial',
    'settlements.villages.title' => 'partial',
])]
class District extends AddressComponent
{
    public function __construct()
    {
        $this->settlements = new ArrayCollection();
        $this->communities = new ArrayCollection();
    }

    #[ORM\ManyToOne(inversedBy: 'districts')]
    #[ORM\JoinColumn(name: 'province_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::DISTRICTS,
    ])]
    private ?Province $province = null;

    /**
     * @var Collection<int, Settlement>
     */
    #[ORM\OneToMany(targetEntity: Settlement::class, mappedBy: 'district', cascade: ['all'])]
    #[Groups([
        G::DISTRICTS,
        G::PROVINCES,
    ])]
    private Collection $settlements;

    /**
     * @var Collection<int, Community>
     */
    #[ORM\OneToMany(targetEntity: Community::class, mappedBy: 'district', cascade: ['all'])]
    #[Groups([
        G::DISTRICTS,
        G::PROVINCES,
    ])]
    private Collection $communities;

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
     * @return Collection<int, Settlement>
     */
    public function getSettlements(): Collection
    {
        return $this->settlements;
    }

    public function addSettlement(Settlement $settlement): static
    {
        if (!$this->settlements->contains($settlement)) {
            $this->settlements->add($settlement);
            $settlement->setDistrict($this);
        }

        return $this;
    }

    public function removeSettlement(Settlement $settlement): static
    {
        if ($this->settlements->removeElement($settlement)) {
            // set the owning side to null (unless already changed)
            if ($settlement->getDistrict() === $this) {
                $settlement->setDistrict(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Community>
     */
    public function getCommunities(): Collection
    {
        return $this->communities;
    }

    public function addCommunity(Community $community): static
    {
        if (!$this->communities->contains($community)) {
            $this->communities->add($community);
            $community->setDistrict($this);
        }

        return $this;
    }

    public function removeCommunity(Community $community): static
    {
        if ($this->communities->removeElement($community)) {
            // set the owning side to null (unless already changed)
            if ($community->getDistrict() === $this) {
                $community->setDistrict(null);
            }
        }

        return $this;
    }
}
