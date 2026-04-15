<?php

namespace App\Entity\Extra;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\ChatMessage;
use App\Entity\Gallery\Gallery;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

/**
 * Универсальная сущность для хранения одного изображения.
 * Используется как единая таблица для всех типов медиа в системе:
 * галереи, тикеты, чаты, обращения, отзывы, техподдержка.
 *
 * Связи опциональны — заполняется только та, к которой относится изображение.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[Vich\Uploadable]
class MultipleImage
{
    use SingleImageTrait, CreatedAtTrait, UpdatedAtTrait, PriorityTrait;

    /**
     * Первичный ключ. Группы сериализации покрывают все контексты,
     * где изображение может появиться в ответе API.
     */
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::CATEGORIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::FAVORITES,
        G::OCCUPATIONS,
        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,
        G::MASTERS,
        G::CLIENTS,
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_USER,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::TECH_SUPPORT,
        G::BLACK_LISTS,
        G::USER_PUBLIC,
        G::TICKET_IMAGES,
    ])]
    protected ?int $id = null;

    /**
     * Автор загрузки — проставляется при загрузке через чат или техподдержку.
     * Nullable: изображения к тикетам/галереям автора не требуют.
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'imageAuthors')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CATEGORIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::FAVORITES,
        G::OCCUPATIONS,
        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,
        G::MASTERS,
        G::CLIENTS,
        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_USER,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::TECH_SUPPORT,
        G::BLACK_LISTS,
        G::USER_PUBLIC,
        G::TICKET_IMAGES,
    ])]
    private ?User $author = null;

    /**
     * Изображение галереи работ мастера.
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'images')]
    #[ApiProperty(writable: false)]
    private ?Gallery $gallery = null;

    /**
     * Изображение тикета (услуги/объявления).
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'images')]
    #[ApiProperty(writable: false)]
    private ?Ticket $ticket = null;

    /**
     * Изображение прикреплённое к сообщению техподдержки.
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'image')]
    #[ApiProperty(writable: false)]
    private ?TechSupportMessage $techSupportMessage = null;

    /**
     * Изображение прикреплённое к отзыву.
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'images')]
    #[ApiProperty(writable: false)]
    private ?Review $review = null;

    /**
     * Изображение прикреплённое к сообщению чата.
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'images')]
    #[ApiProperty(writable: false)]
    private ?ChatMessage $chatMessage = null;

    /**
     * Изображение прикреплённое к обращению (жалобе).
     */
    #[ORM\ManyToOne(cascade: ['persist'], inversedBy: 'images')]
    #[ApiProperty(writable: false)]
    private ?Appeal $appeal = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function getGallery(): ?Gallery
    {
        return $this->gallery;
    }

    public function setGallery(?Gallery $gallery): static
    {
        $this->gallery = $gallery;

        return $this;
    }

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

        return $this;
    }

    public function getTechSupportMessage(): ?TechSupportMessage
    {
        return $this->techSupportMessage;
    }

    public function setTechSupportMessage(?TechSupportMessage $techSupportMessage): static
    {
        $this->techSupportMessage = $techSupportMessage;

        return $this;
    }

    public function getReview(): ?Review
    {
        return $this->review;
    }

    public function setReview(?Review $review): static
    {
        $this->review = $review;

        return $this;
    }

    public function getChatMessage(): ?ChatMessage
    {
        return $this->chatMessage;
    }

    public function setChatMessage(?ChatMessage $chatMessage): static
    {
        $this->chatMessage = $chatMessage;

        return $this;
    }

    public function getAppeal(): ?Appeal
    {
        return $this->appeal;
    }

    public function setAppeal(?Appeal $appeal): static
    {
        $this->appeal = $appeal;

        return $this;
    }
}
