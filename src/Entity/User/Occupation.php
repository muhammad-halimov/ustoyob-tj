<?php

namespace App\Entity\User;

use App\Service\Extra\UuidUtil;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\SlugTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\User;
use App\Repository\User\OccupationRepository;
use App\State\Localization\Title\OccupationTitleLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: OccupationRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/occupations/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            provider: OccupationTitleLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/occupations',
            provider: OccupationTitleLocalizationProvider::class,
        ),
    ],
    normalizationContext: ['groups' => G::OPS_OCCUPATIONS, 'skip_null_values' => false],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class Occupation
{
    use CreatedAtTrait, UpdatedAtTrait, SingleImageTrait, TitleTrait, SlugTrait, DescriptionTrait, PriorityTrait;

    public function __construct()
    {
        $this->education = new ArrayCollection();
        $this->master = new ArrayCollection();
        $this->translations = new ArrayCollection();
        $this->tickets = new ArrayCollection();
    }

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

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::OCCUPATIONS,
        G::CATEGORIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::FAVORITES,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Uuid $id = null;

    /**
     * @var Collection<int, Education>
     */
    #[ORM\OneToMany(targetEntity: Education::class, mappedBy: 'occupation', cascade: ['all'])]
    #[Ignore]
    private Collection $education;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'occupation')]
    #[Ignore]
    private Collection $master;

    // Подкатегория принадлежит РОВНО одной категории — было ManyToMany
    // (occupation <-> category через join-таблицу category_occupation), но
    // ни один код нигде не пользовался тем, что подкатегория теоретически
    // могла бы относиться к нескольким категориям сразу, а данные всегда
    // были 1:1 на практике. ManyToOne — владеющая сторона здесь (FK
    // category_id лежит в occupation), Category::$occupations — обратная.
    #[ORM\ManyToOne(targetEntity: Category::class, inversedBy: 'occupations')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::OCCUPATIONS,
    ])]
    private ?Category $category = null;

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'occupation',cascade: ['persist'])]
    private Collection $translations;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'subcategory', cascade: ['persist'])]
    #[Ignore]
    private Collection $tickets;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    /**
     * @return Collection<int, Education>
     */
    public function getEducation(): Collection
    {
        return $this->education;
    }

    public function addEducation(Education $education): static
    {
        if (!$this->education->contains($education)) {
            $this->education->add($education);
            $education->setOccupation($this);
        }

        return $this;
    }

    public function removeEducation(Education $education): static
    {
        if ($this->education->removeElement($education)) {
            // set the owning side to null (unless already changed)
            if ($education->getOccupation() === $this) {
                $education->setOccupation(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getMaster(): Collection
    {
        return $this->master;
    }

    public function addMaster(User $master): static
    {
        if (!$this->master->contains($master)) {
            $this->master->add($master);
        }

        return $this;
    }

    public function removeMaster(User $master): static
    {
        $this->master->removeElement($master);

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

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
            $translation->setOccupation($this);
        }

        return $this;
    }

    public function removeTranslation(Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            // set the owning side to null (unless already changed)
            if ($translation->getOccupation() === $this) {
                $translation->setOccupation(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Ticket>
     */
    public function getTickets(): Collection
    {
        return $this->tickets;
    }

    public function addTicket(Ticket $ticket): static
    {
        if (!$this->tickets->contains($ticket)) {
            $this->tickets->add($ticket);
            $ticket->setSubcategory($this);
        }

        return $this;
    }

    public function removeTicket(Ticket $ticket): static
    {
        if ($this->tickets->removeElement($ticket)) {
            // set the owning side to null (unless already changed)
            if ($ticket->getSubcategory() === $this) {
                $ticket->setSubcategory(null);
            }
        }

        return $this;
    }
}
