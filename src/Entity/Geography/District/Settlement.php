<?php

namespace App\Entity\Geography\District;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Geography\District\SettlementRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: SettlementRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Settlement
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return  $this->title ?? "Settlement #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'settlements')]
    private ?District $district = null;

    /**
     * @var Collection<int, Village>
     */
    #[ORM\OneToMany(targetEntity: Village::class, mappedBy: 'settlement', cascade: ['all'])]
    private Collection $village;

    public function __construct()
    {
        $this->village = new ArrayCollection();
    }

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
    public function getVillage(): Collection
    {
        return $this->village;
    }

    public function addVillage(Village $village): static
    {
        if (!$this->village->contains($village)) {
            $this->village->add($village);
            $village->setSettlement($this);
        }

        return $this;
    }

    public function removeVillage(Village $village): static
    {
        if ($this->village->removeElement($village)) {
            // set the owning side to null (unless already changed)
            if ($village->getSettlement() === $this) {
                $village->setSettlement(null);
            }
        }

        return $this;
    }
}
