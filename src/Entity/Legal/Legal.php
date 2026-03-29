<?php

namespace App\Entity\Legal;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\TypeTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Repository\Legal\LegalRepository;
use App\State\Localization\Title\LegalLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\Entity(repositoryClass: LegalRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/legals',
            normalizationContext: ['groups' => G::OPS_LEGALS, 'skip_null_values' => false],
            provider: LegalLocalizationProvider::class,
        ),
        new Get(
            uriTemplate: '/legals/{id}',
            normalizationContext: ['groups' => G::OPS_LEGALS, 'skip_null_values' => false],
            provider: LegalLocalizationProvider::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: ['type' => 'exact', 'title', 'description' => 'partial'])]
class Legal
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, TypeTrait;

    public function __toString(): string
    {
        return $this->title ?? "Legal #{$this->id}";
    }

    public const array TYPES = [
        'Политики использования' => 'terms_of_use',
        'Политика конфиденциальности' => 'privacy_policy',
        'Публичная оферта' => 'public_offer',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([G::LEGALS])]
    private ?int $id = null;

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'legal', cascade: ['persist'])]
    #[Ignore]
    private Collection $translations;

    public function __construct()
    {
        $this->translations = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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
            $translation->setLegal($this);
        }
        return $this;
    }

    public function removeTranslation(Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            if ($translation->getLegal() === $this) {
                $translation->setLegal(null);
            }
        }
        return $this;
    }
}
