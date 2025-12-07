<?php

namespace App\Entity\User;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\EducationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: EducationRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Education
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        if ($this->beginning && $this->ending)
            return "$this->uniTitle, $this->beginning - $this->ending";

        return $this->uniTitle ?? "Education #$this->id";
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
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?int $beginning = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?int $ending = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
    ])]
    private ?bool $graduated = null;

    #[ORM\ManyToOne(inversedBy: 'education')]
    #[Ignore]
    private ?User $user = null;

    #[ORM\ManyToOne(inversedBy: 'education')]
    #[Ignore]
    private ?Occupation $occupation = null;

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

    public function getOccupation(): ?Occupation
    {
        return $this->occupation;
    }

    public function setOccupation(?Occupation $occupation): static
    {
        $this->occupation = $occupation;

        return $this;
    }
}
