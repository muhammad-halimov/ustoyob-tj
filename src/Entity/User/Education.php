<?php

namespace App\Entity\User;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\EducationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\Entity(repositoryClass: EducationRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Education
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->uniTitle;
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masters:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?string $uniTitle = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?string $faculty = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?int $beginning = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?int $ending = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?bool $graduated = null;

    #[ORM\ManyToOne(inversedBy: 'education')]
    #[Ignore]
    private ?User $user = null;

    /**
     * @var Collection<int, Occupation>
     */
    #[ORM\OneToMany(targetEntity: Occupation::class, mappedBy: 'education')]
    #[Groups([
        'masters:read',
    ])]
    private Collection $occupation;

    public function __construct()
    {
        $this->occupation = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUniTitle(): ?string
    {
        return $this->uniTitle;
    }

    public function setUniTitle(?string $uniTitle): static
    {
        $this->uniTitle = $uniTitle;

        return $this;
    }

    public function getFaculty(): ?string
    {
        return $this->faculty;
    }

    public function setFaculty(?string $faculty): void
    {
        $this->faculty = $faculty;
    }

    public function getBeginning(): ?int
    {
        return $this->beginning;
    }

    public function setBeginning(?int $beginning): static
    {
        $this->beginning = $beginning;

        return $this;
    }

    public function getEnding(): ?int
    {
        return $this->ending;
    }

    public function setEnding(?int $ending): static
    {
        $this->ending = $ending;

        return $this;
    }

    public function getGraduated(): ?bool
    {
        return $this->graduated;
    }

    public function setGraduated(?bool $graduated): Education
    {
        $this->graduated = $graduated;
        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    /**
     * @return Collection<int, Occupation>
     */
    public function getOccupation(): Collection
    {
        return $this->occupation;
    }

    public function addOccupation(Occupation $occupation): static
    {
        if (!$this->occupation->contains($occupation)) {
            $this->occupation->add($occupation);
            $occupation->setEducation($this);
        }

        return $this;
    }

    public function removeOccupation(Occupation $occupation): static
    {
        if ($this->occupation->removeElement($occupation)) {
            // set the owning side to null (unless already changed)
            if ($occupation->getEducation() === $this) {
                $occupation->setEducation(null);
            }
        }

        return $this;
    }
}
