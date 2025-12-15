<?php
namespace App\Entity\Geography\District;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\Geography\AddressComponent;
use App\Repository\Geography\District\VillageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VillageRepository::class)]
#[ApiResource(operations: [])]
class Village extends AddressComponent
{
    #[ORM\ManyToOne(inversedBy: 'villages')]
    private ?Settlement $settlement = null;

    public function getSettlement(): ?Settlement
    {
        return $this->settlement;
    }

    public function setSettlement(?Settlement $settlement): static
    {
        $this->settlement = $settlement;

        return $this;
    }
}
