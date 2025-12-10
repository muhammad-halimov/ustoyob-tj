<?php

namespace App\Entity\Appeal;

use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Appeal\PostAppealConntroller;
use App\Controller\Api\CRUD\Appeal\PostAppealPhotoController;
use App\Controller\Api\Filter\Appeal\AppealReasonFilterController;
use App\Dto\Appeal\Appeal\AppealInput;
use App\Dto\Appeal\Appeal\ComplaintReasonOutput;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Repository\User\AppealRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: AppealRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/appeals/reasons',
            controller: AppealReasonFilterController::class,
            output: ComplaintReasonOutput::class,
        ),
        new Get(
            uriTemplate: '/appeals/{id}',
            normalizationContext: [
                'groups' => [
                    'appeal:read',
                    'appeal:ticket:read',
                    'appeal:chat:read'
                ]
            ],
            security: "is_granted('ROLE_ADMIN')",
        ),
        new GetCollection(
            uriTemplate: '/appeals',
            normalizationContext: [
                'groups' => [
                    'appeal:read',
                    'appeal:ticket:read',
                    'appeal:chat:read'
                ]
            ],
            security: "is_granted('ROLE_ADMIN')",
        ),
        new Post(
            uriTemplate: '/appeals',
            controller: PostAppealConntroller::class,
            input: AppealInput::class,
        ),
        new Post(
            uriTemplate: '/appeals/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostAppealPhotoController::class,
            input: AppealPhotoInput::class,
        ),
    ],
    paginationEnabled: false,
)]
#[ApiFilter(ExistsFilter::class, properties: ['appealChat', 'appealTicket'])]
#[ApiFilter(SearchFilter::class, properties: [
    'type',
    'appealTicket',
    'appealTicket.title',
    'appealTicket.description',
    'appealTicket.reason',
    'appealTicket.ticket',
    'appealTicket.ticket.title',
    'appealTicket.ticket.service',
    'appealTicket.author',
    'appealTicket.respondent',

    'appealChat',
    'appealChat.title',
    'appealChat.description',
    'appealChat.reason',
    'appealChat.chat',
    'appealChat.author',
    'appealChat.respondent',
])]
class Appeal
{
    public function __toString(): string
    {
        return $this->complaintReason ?? "Жалоба #$this->id";
    }

    public function __construct()
    {
        $this->appealTicket = new ArrayCollection();
        $this->appealChat = new ArrayCollection();
    }

    public const array TYPES = [
        'Услуга / Объявление' => 'ticket',
        'Чат' => 'chat',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
    ])]
    private ?string $type = null;

    /**
     * @var Collection<int, AppealTicket>
     */
    #[ORM\OneToMany(targetEntity: AppealTicket::class, mappedBy: 'appeal', cascade: ['all'])]
    #[Groups([
        'appeal:read',
        'appeal:ticket:read',
    ])]
    #[SerializedName('ticket')]
    private Collection $appealTicket;

    /**
     * @var Collection<int, AppealChat>
     */
    #[ORM\OneToMany(targetEntity: AppealChat::class, mappedBy: 'appeal', cascade: ['all'])]
    #[Groups([
        'appeal:read',
        'appeal:chat:read',
    ])]
    #[SerializedName('chat')]
    private Collection $appealChat;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    #[ORM\PrePersist]
    public function setCreatedAt(): void
    {
        $this->createdAt = new DateTime();
    }

    public function getUpdatedAt(): DateTime
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    #[ORM\PrePersist]
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new DateTime();
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

    /**
     * @return Collection<int, AppealTicket>
     */
    public function getAppealTicket(): Collection
    {
        return $this->appealTicket;
    }

    public function addAppealTicket(AppealTicket $appealTicket): static
    {
        if (!$this->appealTicket->contains($appealTicket)) {
            $this->appealTicket->add($appealTicket);
            $appealTicket->setAppeal($this);
        }

        return $this;
    }

    public function removeAppealTicket(AppealTicket $appealTicket): static
    {
        if ($this->appealTicket->removeElement($appealTicket)) {
            // set the owning side to null (unless already changed)
            if ($appealTicket->getAppeal() === $this) {
                $appealTicket->setAppeal(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealChat>
     */
    public function getAppealChat(): Collection
    {
        return $this->appealChat;
    }

    public function addAppealChat(AppealChat $appealChat): static
    {
        if (!$this->appealChat->contains($appealChat)) {
            $this->appealChat->add($appealChat);
            $appealChat->setAppeal($this);
        }

        return $this;
    }

    public function removeAppealChat(AppealChat $appealChat): static
    {
        if ($this->appealChat->removeElement($appealChat)) {
            // set the owning side to null (unless already changed)
            if ($appealChat->getAppeal() === $this) {
                $appealChat->setAppeal(null);
            }
        }

        return $this;
    }

    public function getInfo(): ?string
    {
        // Получаем читаемый тип из массива TYPES
        $typeCode = $this->type;
        $typeHuman = array_search($typeCode, Appeal::TYPES) ?: $typeCode;

        if (!$this->appealChat->isEmpty()) {
            $appealChat = $this->appealChat->first();

            // Получаем читаемую причину из массива COMPLAINTS
            $complaintCode = $appealChat->getReason();
            $complaintHuman = array_search($complaintCode, AppealChat::COMPLAINTS) ?: $complaintCode;

            return "
                Тип жалобы: ".($typeHuman ?? 'N/A')."
                ID жалобы: {$this->getId()}
                ID чата: ".($appealChat->getChat()?->getId() ?? 'N/A')."
                Заголовок жалобы: ".($appealChat->getTitle() ?? 'N/A')."
                Истец: {$appealChat->getAuthor()->getEmail()}
                Ответчик: {$appealChat->getRespondent()->getEmail()}
                Причина жалобы: ".($complaintHuman ?? 'N/A')."
                Описание: ".($appealChat->getDescription() ?? 'N/A')."
            ";
        }

        if (!$this->appealTicket->isEmpty()) {
            $appealTicket = $this->appealTicket->first();

            // Получаем читаемую причину из массива COMPLAINTS
            $complaintCode = $appealTicket->getReason();
            $complaintHuman = array_search($complaintCode, AppealTicket::COMPLAINTS) ?: $complaintCode;

            return "
                Тип жалобы: ".($typeHuman ?? 'N/A')."
                ID жалобы: {$this->getId()}
                ID услуги/объявления: ".($appealTicket->getTicket()?->getId() ?? 'N/A')."
                Заголовок жалобы: ".($appealTicket->getTitle() ?? 'N/A')."
                Истец: {$appealTicket->getAuthor()->getEmail()}
                Ответчик: {$appealTicket->getRespondent()->getEmail()}
                Причина жалобы: ".($complaintHuman ?? 'N/A')."
                Описание: ".($appealTicket->getDescription() ?? 'N/A')."
            ";
        }

        return null;
    }
}
