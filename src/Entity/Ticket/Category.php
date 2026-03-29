<?php

namespace App\Entity\Ticket;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\User\Occupation;
use App\Repository\Ticket\CategoryRepository;
use App\State\Localization\Title\CategoryTitleLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: CategoryRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/categories/{id}',
            requirements: ['id' => '\d+'],
            provider: CategoryTitleLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/categories',
            provider: CategoryTitleLocalizationProvider::class,
        ),
    ],
    normalizationContext: ['groups' => G::OPS_CATEGORIES, 'skip_null_values' => false],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: ['occupations', 'description' => 'partial', 'title'])]
class Category
{
    use UpdatedAtTrait, CreatedAtTrait, SingleImageTrait, TitleTrait, DescriptionTrait, PriorityTrait;

    public function __toString(): string
    {
        if ($this->translations->isEmpty()) return "Category #$this->id";

        $titles = [];

        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();

            if ($title !== null && $title !== '') $titles[] = $title;
        }

        return !empty($titles) ? implode(', ', $titles) : "Category #$this->id";
    }

    public function __construct()
    {
        $this->userTickets = new ArrayCollection();
        $this->translations = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::CATEGORIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::OCCUPATIONS,
    ])]
    private ?int $id = null;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'category', cascade: ['persist'])]
    #[Ignore]
    private Collection $userTickets;

    #[ORM\ManyToOne(inversedBy: 'categories')]
    #[Groups([
        G::CATEGORIES,
    ])]
    private ?Occupation $occupation = null;

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'category', cascade: ['persist'])]
    private Collection $translations;

    public function getId(): ?int
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
            $userTicket->setCategory($this);
        }

        return $this;
    }

    public function removeUserTicket(Ticket $userTicket): static
    {
        if ($this->userTickets->removeElement($userTicket)) {
            // set the owning side to null (unless already changed)
            if ($userTicket->getCategory() === $this) {
                $userTicket->setCategory(null);
            }
        }

        return $this;
    }

    public function getOccupation(): ?Occupation
    {
        return $this->occupation;
    }

    public function setOccupation(?Occupation $occupations): static
    {
        $this->occupation = $occupations;

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
            $translation->setCategory($this);
        }

        return $this;
    }

    public function removeTranslation(Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            // set the owning side to null (unless already changed)
            if ($translation->getCategory() === $this) {
                $translation->setCategory(null);
            }
        }

        return $this;
    }
}
