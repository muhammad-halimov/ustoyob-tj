<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation as OpenApiOperation;
use ApiPlatform\OpenApi\Model\Parameter as OpenApiParameter;
use App\Controller\Api\CRUD\DELETE\Chat\Chat\ApiDeleteChatController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetChatController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetChatSubscribeTokenController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetMyChatsController;
use App\Controller\Api\CRUD\PATCH\Chat\Chat\ApiPatchChatController;
use App\Controller\Api\CRUD\POST\Chat\Chat\ApiPostChatController;
use App\Dto\Chat\ChatPatchInput;
use App\Dto\Chat\ChatPostInput;
use App\Entity\Appeal\Types\AppealChat;
use App\Entity\Extra\MultipleImage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
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
            controller: ApiGetChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
        ),
        // [MERCURE] Эндпоинт для получения подписного JWT-токена.
        // Фронтенд вызывает его перед открытием SSE-соединения.
        new Get(
            uriTemplate: '/chats/{id}/subscribe',
            requirements: ['id' => '\d+'],
            controller: ApiGetChatSubscribeTokenController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
        ),
        new GetCollection(
            uriTemplate: '/chats/me',
            controller: ApiGetMyChatsController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
            openapi: new OpenApiOperation(
                parameters: [
                    new OpenApiParameter(name: 'ticket', in: 'query', required: false, schema: ['type' => 'integer'], description: 'Filter by ticket ID'),
                    new OpenApiParameter(name: 'active', in: 'query', required: false, schema: ['type' => 'boolean'], description: 'Filter by active status (true/false or 1/0)'),
                ],
            ),
        ),
        new Post(
            uriTemplate: '/chats',
            controller: ApiPostChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
            input: ChatPostInput::class,
        ),
        new Patch(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
            input: ChatPatchInput::class,
        ),
        new Delete(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiDeleteChatController::class,
        )
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class Chat
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string
    {
        return "Chat #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_CHAT,
    ])]
    private ?int $id = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_CHAT,
    ])]
    private ?bool $active = null;

    #[ORM\ManyToOne(inversedBy: 'messageAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CHATS,
        G::APPEAL_CHAT,
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'messageReplyAuthor')]
    #[ORM\JoinColumn(name: 'reply_author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CHATS,
        G::APPEAL_CHAT,
    ])]
    private ?User $replyAuthor = null;

    #[ORM\ManyToOne(inversedBy: 'chats')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CHATS,
        G::APPEAL_CHAT,
    ])]
    private ?Ticket $ticket = null;

    /**
     * @var Collection<int, ChatMessage>
     */
    #[ORM\OneToMany(targetEntity: ChatMessage::class, mappedBy: 'chat', cascade: ['all'])]
    #[Groups([
        G::CHATS,
    ])]
    #[ApiProperty(writable: false)]
    private Collection $messages;

    /**
     * @var Collection<int, AppealChat>
     */
    #[ORM\OneToMany(targetEntity: AppealChat::class, mappedBy: 'chat', cascade: ['all'])]
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
     * Returns all MultipleImage objects from all messages, sorted newest first.
     *
     * @return MultipleImage[]
     */
    #[Groups([
        G::CHATS,
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    public function getImages(): array
    {
        $images = [];

        foreach ($this->messages as $message) {
            foreach ($message->getImages() as $image) {
                $images[] = $image;
            }
        }

        usort($images, fn(MultipleImage $a, MultipleImage $b) => $b->getCreatedAt() <=> $a->getCreatedAt());

        return $images;
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
    #[Groups([G::CHATS, G::CHAT_MESSAGES])]
    #[SerializedName('mercureTopic')]
    public function getMercureTopic(): string
    {
        return "chat:{$this->id}";
    }
}
