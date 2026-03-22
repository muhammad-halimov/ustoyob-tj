<?php
namespace App\Entity\Geography\Abstract;

use App\Entity\Extra\Translation;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\DescriptionTrait;
use App\Entity\Trait\SingleImageTrait;
use App\Entity\Trait\TitleTrait;
use App\Entity\Trait\UpdatedAtTrait;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
#[ORM\InheritanceType('JOINED')] // или SINGLE_TABLE
abstract class AddressComponent
{
    use UpdatedAtTrait, CreatedAtTrait, SingleImageTrait, TitleTrait, DescriptionTrait;

    public function __toString(): string
    {
        if ($this->translations->isEmpty()) return "Abstract #$this->id";

        $titles = [];

        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();

            if ($title !== null && $title !== '') $titles[] = $title;
        }

        return !empty($titles) ? implode(', ', $titles) : "Abstract #$this->id";
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
        'favorites:read',
        'cities:read',
        'masters:read',
        'clients:read',

        'user:public:read',
    ])]
    protected ?int $id = null;

    /**
     * @var Collection<int, Translation>|null
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'address', cascade: ['persist'])]
    private ?Collection $translations = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function __toArray(): array
    {
        return [
            'id' => $this->id,
        ];
    }

    /**
     * @return Collection
     */
    public function getTranslations(): Collection
    {
        if ($this->translations === null) {
            $this->translations = new ArrayCollection();
        }

        return $this->translations;
    }

    public function addTranslation(?Translation $translation): static
    {
        if ($translation === null) {
            return $this;
        }

        if ($this->translations === null) {
            $this->translations = new ArrayCollection();
        }

        if (!$this->translations->contains($translation)) {
            $this->translations->add($translation);
            $translation->setAddress($this);
        }

        return $this;
    }

    public function removeTranslation(?Translation $translation): static
    {
        if ($this->translations === null) {
            $this->translations = new ArrayCollection();
        }

        if ($this->translations->removeElement($translation)) {
            if ($translation->getAddress() === $this) {
                $translation->setAddress(null);
            }
        }

        return $this;
    }
}
