<?php

namespace App\Entity\Legal;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Repository\Legal\LegalRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: LegalRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/legals',
            normalizationContext: [
                'groups' => ['legals:read'],
                'skip_null_values' => false,
            ],
        ),
        new Get(
            uriTemplate: '/legals/{id}',
            normalizationContext: [
                'groups' => ['legals:read'],
                'skip_null_values' => false,
            ],
        ),
    ],
    paginationEnabled: false,
)]
#[ApiFilter(SearchFilter::class, properties: ['type' => 'exact', 'title', 'description' => 'partial'])]
class Legal
{
    use CreatedAtTrait, UpdatedAtTrait;

    public const array TYPES = [
        'Политики использования' => 'terms_of_use',
        'Политика конфиденциальности' => 'privacy_policy',
        'Публичная оферта' => 'public_offer',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['legals:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups(['legals:read'])]
    private ?string $type = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['legals:read'])]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['legals:read'])]
    private ?string $description = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(?string $type): static
    {
        $this->type = $type;

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
}
