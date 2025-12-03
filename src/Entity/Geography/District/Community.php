<?php
namespace App\Entity\Geography\District;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\Geography\AddressComponent;
use App\Repository\Geography\District\CommunityRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CommunityRepository::class)]
#[ApiResource(operations: [])]
class Community extends AddressComponent
{
    #[ORM\ManyToOne(inversedBy: 'communities')]
    private ?District $district = null;

    public function getDistrict(): ?District
    {
        return $this->district;
    }

    public function setDistrict(?District $district): static
    {
        $this->district = $district;

        return $this;
    }
}
