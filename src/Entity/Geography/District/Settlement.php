<?php
namespace App\Entity\Geography\District;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\Geography\AddressComponent;
use App\Repository\Geography\District\SettlementRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: SettlementRepository::class)]
#[ApiResource(operations: [])]
class Settlement extends AddressComponent
{
    #[ORM\ManyToOne(inversedBy: 'settlements')]
    private ?District $district = null;

    /**
     * @var Collection<int, Village>
     */
    #[ORM\OneToMany(targetEntity: Village::class, mappedBy: 'settlement', cascade: ['all'])]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private Collection $villages;

    public function __construct()
    {
        $this->villages = new ArrayCollection();
    }

    public function getDistrict(): ?District
    {
        return $this->district;
    }

    public function setDistrict(?District $district): static
    {
        $this->district = $district;

        return $this;
    }

    /**
     * @return Collection<int, Village>
     */
    public function getVillages(): Collection
    {
        return $this->villages;
    }

    public function addVillage(Village $village): static
    {
        if (!$this->villages->contains($village)) {
            $this->villages->add($village);
            $village->setSettlement($this);
        }

        return $this;
    }

    public function removeVillage(Village $village): static
    {
        if ($this->villages->removeElement($village)) {
            // set the owning side to null (unless already changed)
            if ($village->getSettlement() === $this) {
                $village->setSettlement(null);
            }
        }

        return $this;
    }
}
