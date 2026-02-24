<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\Chat\Chat\DeleteChatController;
use App\Controller\Api\CRUD\Chat\Chat\GetChatSubscribeTokenController;
use App\Controller\Api\CRUD\Chat\Chat\PatchChatController;
use App\Controller\Api\CRUD\Chat\Chat\PostChatController;
use App\Controller\Api\Filter\Chat\ChatFilterController;
use App\Controller\Api\Filter\Chat\PersonalChatFilterController;
use App\Dto\Chat\ChatPatchInput;
use App\Dto\Chat\ChatPostInput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ChatRepository::class)]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            controller: ChatFilterController::class,
        ),
        // [MERCURE] Эндпоинт для получения подписного JWT-токена.
        // Фронтенд вызывает его перед открытием SSE-соединения.
        new Get(
            uriTemplate: '/chats/{id}/subscribe',
            requirements: ['id' => '\d+'],
            controller: GetChatSubscribeTokenController::class,
        ),
        new GetCollection(
            uriTemplate: '/chats/me',
            controller: PersonalChatFilterController::class,
        ),
        new Post(
            uriTemplate: '/chats',
            controller: PostChatController::class,
            input: ChatPostInput::class,
        ),
        new Patch(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchChatController::class,
            input: ChatPatchInput::class,
        ),
        new Delete(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            controller: DeleteChatController::class,
        )
    ],
    normalizationContext: [
        'groups' => ['chats:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class Chat
{
    public function __toString(): string
    {
        return "Chat #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'chats:read',
        'chatMessages:read',
        'appeal:chat:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'chats:read',
        'chatMessages:read',
        'appeal:chat:read',
    ])]
    private ?bool $active = null;

    #[ORM\ManyToOne(inversedBy: 'messageAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'appeal:chat:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'messageReplyAuthor')]
    #[ORM\JoinColumn(name: 'reply_author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'appeal:chat:read',
    ])]
    private ?User $replyAuthor = null;

    #[ORM\ManyToOne(inversedBy: 'chats')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'appeal:chat:read',
    ])]
    private ?Ticket $ticket = null;

    /**
     * @var Collection<int, ChatMessage>
     */
    #[ORM\OneToMany(targetEntity: ChatMessage::class, mappedBy: 'chat', cascade: ['all'])]
    #[Groups([
        'chats:read',
    ])]
    #[ApiProperty(writable: false)]
    private Collection $messages;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'chats:read',
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'chats:read',
    ])]
    protected DateTime $updatedAt;

    /**
     * @var Collection<int, AppealChat>
     */
    #[ORM\OneToMany(targetEntity: AppealChat::class, mappedBy: 'chat')]
    #[Ignore]
    private Collection $appealChats;

    public function __construct()
    {
        $this->messages = new ArrayCollection();
        $this->appealChats = new ArrayCollection();
    }

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

    public function getReplyAuthor(): ?User
    {
        return $this->replyAuthor;
    }

    public function setReplyAuthor(?User $replyAuthor): static
    {
        $this->replyAuthor = $replyAuthor;

        return $this;
    }

    /**
     * @return Collection<int, ChatMessage>
     */
    public function getMessages(): Collection
    {
        return $this->messages;
    }

    public function addMessage(ChatMessage $message): static
    {
        if (!$this->messages->contains($message)) {
            $this->messages->add($message);
            $message->setChat($this);
        }

        return $this;
    }

    public function removeMessage(ChatMessage $message): static
    {
        if ($this->messages->removeElement($message)) {
            // set the owning side to null (unless already changed)
            if ($message->getChat() === $this) {
                $message->setChat(null);
            }
        }

        return $this;
    }

    /**
     * Returns all ChatImage objects from all messages, sorted newest first.
     *
     * @return ChatImage[]
     */
    #[Groups([
        'chats:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    public function getImages(): array
    {
        $images = [];

        foreach ($this->messages as $message) {
            foreach ($message->getChatImages() as $image) {
                $images[] = $image;
            }
        }

        usort($images, fn(ChatImage $a, ChatImage $b) => $b->getCreatedAt() <=> $a->getCreatedAt());

        return $images;
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

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

        return $this;
    }

    /**
     * @return Collection<int, AppealChat>
     */
    public function getAppealChats(): Collection
    {
        return $this->appealChats;
    }

    public function addAppealChat(AppealChat $appealChat): static
    {
        if (!$this->appealChats->contains($appealChat)) {
            $this->appealChats->add($appealChat);
            $appealChat->setChat($this);
        }

        return $this;
    }

    public function removeAppealChat(AppealChat $appealChat): static
    {
        if ($this->appealChats->removeElement($appealChat)) {
            // set the owning side to null (unless already changed)
            if ($appealChat->getChat() === $this) {
                $appealChat->setChat(null);
            }
        }

        return $this;
    }

    public function getActive(): ?bool
    {
        return $this->active;
    }

    public function setActive(?bool $active): static
    {
        $this->active = $active;
        return $this;
    }

    /**
     * [MERCURE] Возвращает имя топика этого чата.
     *
     * Это виртуальное поле — в БД не хранится, вычисляется на лету.
     * Попадает в JSON-ответ как "mercureTopic": "chat:42".
     * Фронтенд читает его из ответа GET /api/chats/{id} и сразу знает,
     * на какой топик подписываться — без хардкода на клиенте.
     */
    #[Groups(['chats:read', 'chatMessages:read'])]
    #[SerializedName('mercureTopic')]
    public function getMercureTopic(): string
    {
        return "chat:{$this->id}";
    }
}
