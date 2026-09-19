<?php
namespace App\Entity\Geography\Abstract;

use App\Service\Extra\UuidUtil;

use App\Entity\Extra\Translation;
use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\SlugTrait;
use App\Entity\Trait\Readable\TitleTrait;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
#[ORM\InheritanceType('JOINED')] // или SINGLE_TABLE
abstract class AddressComponent
{
    use UpdatedAtTrait, CreatedAtTrait, SingleImageTrait, TitleTrait, SlugTrait, DescriptionTrait;

    public function __toString(): string
    {
        // $translations типизирован как ?Collection и по умолчанию null —
        // City/District/Province/Settlement переопределяют __construct() не
        // вызывая parent::__construct(), поэтому у свежесозданного (ещё не
        // сохранённого) объекта он реально null. Используем getTranslations()
        // (тот же безопасный геттер, что и везде в этом классе) вместо сырого
        // свойства — иначе на пустом/несуществующем translations падает
        // "Call to a member function isEmpty() on null".
        $translations = $this->getTranslations();

        $titles = [];

        if (!$translations->isEmpty()) {
            foreach ($translations as $translation) {
                $title = $translation->getTitle();

                if ($title !== null && $title !== '') $titles[] = $title;
            }
        }

        return !empty($titles) ? implode(', ', $titles) : ('#' . UuidUtil::short($this->id));
    }

    public function __construct()
    {
        $this->translations = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
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
    protected ?Uuid $id = null;

    /**
     * @var Collection<int, Translation>|null
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'address', cascade: ['persist'])]
    private ?Collection $translations = null;

    public function getId(): ?Uuid
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
