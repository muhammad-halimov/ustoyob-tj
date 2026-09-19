<?php

namespace App\Entity\Appeal\Reason;

use App\Service\Extra\UuidUtil;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Extra\Translation;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\SlugTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Repository\Appeal\AppealReasonRepository;
use App\State\Localization\Title\AppealReasonLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealReasonRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/appeal-reasons/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            provider: AppealReasonLocalizationProvider::class,
        ),
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
#[ApiFilter(BooleanFilter::class, properties: ['authRequired'])]
class AppealReason
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, SlugTrait;

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
            return $this->code ?: ('#' . UuidUtil::short($this->id));
        }

        $titles = [];
        foreach ($this->translations as $translation) {
            $title = $translation->getTitle();
            if ($title !== null && $title !== '') {
                $titles[] = "[{$translation->getLocale()}] $title";
            }
        }

        $label = !empty($titles) ? implode(', ', $titles) : $this->code;

        return $label ?: ('#' . UuidUtil::short($this->id));
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::APPEAL_REASON,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
        G::TECH_SUPPORT,
    ])]
    private ?Uuid $id = null;

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

    /** chat | ticket | overall */
    #[ORM\Column(length: 16)]
    #[Groups([
        G::APPEAL_REASON,
    ])]
    private string $applicableTo = 'overall';

    /** overall */
    #[ORM\Column(type: 'boolean', nullable: false)]
    #[Groups([
        G::APPEAL_REASON,
    ])]
    private bool $authRequired = true;

    /**
     * @var Collection<int, Translation>
     */
    #[ORM\OneToMany(targetEntity: Translation::class, mappedBy: 'reason', cascade: ['persist'])]
    private Collection $translations;

    public function __construct()
    {
        $this->translations = new ArrayCollection();
    }

    public function getId(): ?Uuid
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

    public function getAuthRequired(): bool
    {
        return $this->authRequired;
    }

    public function setAuthRequired(bool $authRequired): AppealReason
    {
        $this->authRequired = $authRequired;

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
