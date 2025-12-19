<?php
namespace App\Entity\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
#[ORM\InheritanceType('JOINED')] // или SINGLE_TABLE
abstract class AddressComponent
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        if ($this->translations->isEmpty()) return "Address #$this->id";

        $titles = [];

        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();

            if ($title !== null && $title !== '') $titles[] = $title;
        }

        return !empty($titles) ? implode(', ', $titles) : "Address #$this->id";
    }

    public function __construct()
    {
        $this->translations = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'cities:read',
        'masters:read',
        'clients:read',
    ])]
    protected ?int $id = null;

    #[ORM\Column(type: 'string', nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'cities:read',
        'masters:read',
        'clients:read',
    ])]
    private ?string $title = null;

    /**
     * @var Collection<int, Translation>|null
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'address', cascade: ['persist'])]
    private ?Collection $translations = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
        'cities:read',
    ])]
    private ?string $description = null;

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
        return strip_tags($this->description);
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function __toArray(): array
    {
        return [
            'id' => $this->id,
        ];
    }

    /**
     * @return Collection<int, Translation>|null
     */
    public function getTranslations(): ?Collection
    {
        return $this->translations;
    }

    public function addTranslation(?Translation $translation): static
    {
        if (!$this->translations->contains($translation)) {
            $this->translations->add($translation);
            $translation->setAddress($this);
        }

        return $this;
    }

    public function removeTranslation(?Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            // set the owning side to null (unless already changed)
            if ($translation->getAddress() === $this) {
                $translation->setAddress(null);
            }
        }

        return $this;
    }
}
