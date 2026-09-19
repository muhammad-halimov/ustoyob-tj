<?php

namespace App\Entity\Ticket;

use App\Service\Extra\UuidUtil;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\SlugTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Repository\Ticket\UnitRepository;
use App\State\Localization\Title\UnitTitleLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\Entity(repositoryClass: UnitRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/units/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            provider: UnitTitleLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/units',
            provider: UnitTitleLocalizationProvider::class,
        ),
    ],
    normalizationContext: ['groups' => G::OPS_UNITS, 'skip_null_values' => false],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class Unit
{
    use UpdatedAtTrait, CreatedAtTrait, TitleTrait, SlugTrait, DescriptionTrait, PriorityTrait;

    public function __toString(): string
    {
        $titles = [];

        if (!$this->translations->isEmpty()) {
            foreach ($this->translations as $translation) {
                $title = $translation->getTitle();

                if ($title !== null && $title !== '') $titles[] = $title;
            }
        }

        return !empty($titles) ? implode(', ', $titles) : ('#' . UuidUtil::short($this->id));
    }

    public function __construct()
    {
        $this->userTickets = new ArrayCollection();
        $this->translations = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::UNITS,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Uuid $id = null;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'unit', cascade: ['persist'], orphanRemoval: false)]
    #[Ignore]
    private Collection $userTickets;

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'unit', cascade: ['persist'])]
    private Collection $translations;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    /**
     * @return Collection<int, Ticket>
     */
    public function getUserTickets(): Collection
    {
        return $this->userTickets;
    }

    public function addUserTicket(Ticket $userTicket): static
    {
        if (!$this->userTickets->contains($userTicket)) {
            $this->userTickets->add($userTicket);
            $userTicket->setUnit($this);
        }

        return $this;
    }

    public function removeUserTicket(Ticket $userTicket): static
    {
        if ($this->userTickets->removeElement($userTicket)) {
            // set the owning side to null (unless already changed)
            if ($userTicket->getUnit() === $this) {
                $userTicket->setUnit(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Translation>
     */
    public function getTranslations(): Collection
    {
        return $this->translations;
    }

    public function addTranslation(Translation $translation): static
    {
        if (!$this->translations->contains($translation)) {
            $this->translations->add($translation);
            $translation->setUnit($this);
        }

        return $this;
    }

    public function removeTranslation(Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            // set the owning side to null (unless already changed)
            if ($translation->getUnit() === $this) {
                $translation->setUnit(null);
            }
        }

        return $this;
    }
}
