<?php

namespace App\Entity\Geography;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Geography\TranslationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

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
    private ?string $locale = null;

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
    #[ORM\JoinColumn(nullable: false)]
    private ?AddressComponent $address = null;

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
}
