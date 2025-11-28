<?php

namespace App\Entity\Geography\District;

use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Geography\District\VillageRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: VillageRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Village
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return  $this->title ?? "Village #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'districts:read',
        'provinces:read',
    ])]
    private ?string $description = null;

    #[ORM\ManyToOne(inversedBy: 'village')]
    private ?Settlement $settlement = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getSettlement(): ?Settlement
    {
        return $this->settlement;
    }

    public function setSettlement(?Settlement $settlement): static
    {
        $this->settlement = $settlement;

        return $this;
    }
}
