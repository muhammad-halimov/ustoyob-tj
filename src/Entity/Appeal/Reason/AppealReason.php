<?php

namespace App\Entity\Appeal\Reason;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Repository\Appeal\AppealReasonRepository;
use App\State\Localization\Title\AppealReasonLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealReasonRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/appeal-reasons',
            provider: AppealReasonLocalizationProvider::class,
        ),
    ],
    normalizationContext: [
        'groups' => G::OPS_APPEAL_REASON,
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
#[ApiFilter(SearchFilter::class, properties: ['applicableTo' => 'exact'])]
class AppealReason
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait;

    public const array APPLICABLE_TO_CHOICES = [
        'Для чатов'          => 'chat',
        'Для объявлений'     => 'ticket',
        'Для отзывов'        => 'review',
        'Для пользователей'  => 'user',
        'Для тех. поддержки' => 'support',
        'Для всех'           => 'overall',
    ];

    public function __toString(): string
    {
        if ($this->translations->isEmpty()) {
            return $this->code ?? "AppealReason #$this->id";
        }

        $titles = [];
        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();
            if ($title !== null && $title !== '') {
                $titles[] = "[{$translation->getLocale()}] $title";
            }
        }

        return !empty($titles) ? implode(', ', $titles) : ($this->code ?? "AppealReason #$this->id");
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::APPEAL_REASON,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
        G::TECH_SUPPORT,
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 64, unique: true)]
    #[Groups([
        G::APPEAL_REASON,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
        G::TECH_SUPPORT,
    ])]
    private ?string $code = null;

    /** chat | ticket | both */
    #[ORM\Column(length: 16)]
    #[Groups([
        G::APPEAL_REASON,
    ])]
    private string $applicableTo = 'both';

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'reason', cascade: ['persist'])]
    private Collection $translations;

    public function __construct()
    {
        $this->translations = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(?string $code): static
    {
        $this->code = $code;

        return $this;
    }

    public function getApplicableTo(): string
    {
        return $this->applicableTo;
    }

    public function setApplicableTo(string $applicableTo): static
    {
        $this->applicableTo = $applicableTo;

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
            $translation->setReason($this);
        }

        return $this;
    }

    public function removeTranslation(Translation $translation): static
    {
        if ($this->translations->removeElement($translation)) {
            if ($translation->getReason() === $this) {
                $translation->setReason(null);
            }
        }

        return $this;
    }
}
