<?php
namespace App\Entity\Geography\District;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Geography\AddressComponent;
use App\Entity\Geography\Province;
use App\Repository\DistrictRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

use Symfony\Component\Serializer\Attribute\Groups;
use Vich\UploaderBundle\Mapping\Attribute as Vich;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\HttpFoundation\File\File;

#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: DistrictRepository::class)]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/districts/{id}',
            requirements: ['id' => '\d+'],
        ),
        new GetCollection(
            uriTemplate: '/districts',
        ),
    ],
    normalizationContext: [
        'groups' => ['districts:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class District extends AddressComponent
{
    #[Vich\UploadableField(mapping: 'district_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

    #[ORM\ManyToOne(inversedBy: 'districts')]
    #[ORM\JoinColumn(name: 'province_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'districts:read',
    ])]
    private ?Province $province = null;

    /**
     * @var Collection<int, Settlement>
     */
    #[ORM\OneToMany(targetEntity: Settlement::class, mappedBy: 'district', cascade: ['all'])]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private Collection $settlements;

    /**
     * @var Collection<int, Community>
     */
    #[ORM\OneToMany(targetEntity: Community::class, mappedBy: 'district', cascade: ['all'])]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private Collection $communities;

    public function __construct()
    {
        $this->settlements = new ArrayCollection();
        $this->communities = new ArrayCollection();
    }

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
