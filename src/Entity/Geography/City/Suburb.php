<?php
namespace App\Entity\Geography\City;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\Geography\Abstract\AddressComponent;
use App\Repository\Geography\City\SuburbRepository;
use Doctrine\ORM\Mapping as ORM;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: SuburbRepository::class)]
#[ApiResource(operations: [])]
class Suburb extends AddressComponent
{
    #[ORM\ManyToOne(inversedBy: 'suburbs')]
    private ?City $cities = null;

    public function getCities(): ?City
    {
        return $this->cities;
    }

    public function setCities(?City $cities): static
    {
        $this->cities = $cities;

        return $this;
    }
}
