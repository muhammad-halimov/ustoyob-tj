<?php
namespace App\Entity\Geography\Abstract;

use App\Entity\Extra\Translation;
use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\TitleTrait;
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
        G::DISTRICTS,
        G::PROVINCES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::GALLERIES,
        G::CITIES,
        G::MASTERS,
        G::CLIENTS,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
        G::USER_PUBLIC,
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
