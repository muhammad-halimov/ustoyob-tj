<?php

namespace App\Entity\Extra;

use App\Entity\Geography\AddressComponent;
use App\Entity\Ticket\Category;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User\Occupation;
use App\Repository\Geography\TranslationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: TranslationRepository::class)]
class Translation
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return $this->title ?? "Translation #$this->id";
    }

    public function __toArray(): array
    {
        return $this->__toArray();
    }

    public const array LOCALES = [
        'Таджикский' => 'tj',
        'Английский' => 'eng',
        'Русский' => 'ru',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 4, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
        'masterTickets:read',
        'clientTickets:read',
        'cities:read',
        'masters:read',
        'clients:read',
    ])]
    private ?string $locale = 'tj';

    #[ORM\Column(length: 255, nullable: true)]
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

    #[ORM\ManyToOne(inversedBy: 'translations')]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Ignore]
    private ?AddressComponent $address = null;

    #[ORM\ManyToOne(inversedBy: 'translations')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Ignore]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'translations')]
    #[ORM\JoinColumn(name: 'occupation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Ignore]
    private ?Occupation $occupation = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLocale(): ?string
    {
        return $this->locale;
    }

    public function setLocale(?string $locale): static
    {
        $this->locale = $locale;

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

    public function getAddress(): ?AddressComponent
    {
        return $this->address;
    }

    public function setAddress(?AddressComponent $address): static
    {
        $this->address = $address;

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
