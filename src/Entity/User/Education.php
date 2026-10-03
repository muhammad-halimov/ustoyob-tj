<?php

namespace App\Entity\User;

use App\Service\Extra\UuidUtil;

use App\Entity\Trait\NonReadable\CreatedAtTrait;
use App\Entity\Trait\NonReadable\UpdatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\User;
use App\Repository\User\EducationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: EducationRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Education
{
    use UpdatedAtTrait, CreatedAtTrait, TitleTrait, DescriptionTrait;

    public function __toString(): string
    {
        if ($this->beginning && $this->ending)
            return "$this->title, $this->beginning - $this->ending";

        return $this->title ?: ('#' . UuidUtil::short($this->id));
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Uuid $id = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?int $beginning = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?int $ending = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?bool $graduated = null;

    #[ORM\ManyToOne(inversedBy: 'education')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    #[Ignore]
    private ?User $user = null;

    #[ORM\ManyToOne(inversedBy: 'education')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Occupation $occupation = null;

    public function getId(): ?Uuid
    {
        return $this->id;
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
