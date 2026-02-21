<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\OccupationRepository;
use App\State\Localization\Title\OccupationTitleLocalizationProvider;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: OccupationRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/occupations/{id}',
            requirements: ['id' => '\d+'],
            provider: OccupationTitleLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/occupations',
            provider: OccupationTitleLocalizationProvider::class,
        ),
    ],
    normalizationContext: [
        'groups' => ['occupations:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Occupation
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string
    {
        if ($this->translations->isEmpty()) return "Occupation #$this->id";

        $titles = [];

        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();

            if ($title !== null && $title !== '') $titles[] = $title;
        }

        return !empty($titles) ? implode(', ', $titles) : "Occupation #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'occupations:read',
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',

        'user:public:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups([
        'masters:read',
        'occupations:read',
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',

        'user:public:read',
    ])]
    private ?int $order = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        'masters:read',
        'occupations:read',
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',

        'user:public:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'occupations:read'
    ])]
    private ?string $description = null;

    #[Vich\UploadableField(mapping: 'occupation_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'masters:read',
        'occupations:read',
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

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

    /**
     * @var Collection<int, Category>
     */
    #[ORM\OneToMany(targetEntity: Category::class, mappedBy: 'occupation')]
    #[Groups([
        'occupations:read',
    ])]
    private Collection $categories;

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

    public function __construct()
    {
        $this->education = new ArrayCollection();
        $this->master = new ArrayCollection();
        $this->categories = new ArrayCollection();
        $this->translations = new ArrayCollection();
        $this->tickets = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOrder(): ?int
    {
        return $this->order;
    }

    public function setOrder(?int $order): Occupation
    {
        $this->order = $order;

        return $this;
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

    /**
     * @return Collection<int, Category>
     */
    public function getCategories(): Collection
    {
        return $this->categories;
    }

    public function addCategory(Category $category): static
    {
        if (!$this->categories->contains($category)) {
            $this->categories->add($category);
            $category->setOccupation($this);
        }

        return $this;
    }

    public function removeCategory(Category $category): static
    {
        if ($this->categories->removeElement($category)) {
            // set the owning side to null (unless already changed)
            if ($category->getOccupation() === $this) {
                $category->setOccupation(null);
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
