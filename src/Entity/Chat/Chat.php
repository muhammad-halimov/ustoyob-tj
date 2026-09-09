<?php

namespace App\Entity\Chat;

use App\Service\Extra\UuidUtil;

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
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetChatMessagesController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetChatSubscribeTokenController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetInboxTokenController;
use App\Controller\Api\CRUD\GET\Chat\Chat\ApiGetMyChatsController;
use App\Controller\Api\CRUD\PATCH\Chat\Chat\ApiPatchChatController;
use App\Controller\Api\CRUD\POST\Chat\Chat\ApiPostChatController;
use App\Controller\Api\CRUD\POST\Chat\Chat\ApiPostMarkChatReadController;
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
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ChatRepository::class)]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiGetChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
        ),
        // [MERCURE] Эндпоинт для получения подписного JWT-токена.
        // Фронтенд вызывает его перед открытием SSE-соединения.
        new Get(
            uriTemplate: '/chats/{id}/subscribe',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiGetChatSubscribeTokenController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
        ),
        // [MERCURE] Токен для подписки на ВСЕ чаты пользователя одновременно.
        // Используется для глобального inbox SSE — обновление бабла непрочитанных.
        new Get(
            uriTemplate: '/chats/inbox-token',
            controller: ApiGetInboxTokenController::class,
            read: false,
        ),
        new GetCollection(
            uriTemplate: '/chats/me',
            controller: ApiGetMyChatsController::class,
            openapi: new OpenApiOperation(
                parameters: [
                    new OpenApiParameter(name: 'ticket', in: 'query', description: 'Filter by ticket ID', required: false, schema: ['type' => 'integer']),
                    new OpenApiParameter(name: 'active', in: 'query', description: 'Filter by active status (true/false or 1/0)', required: false, schema: ['type' => 'boolean']),
                    new OpenApiParameter(name: 'user', in: 'query', description: 'Filter by counterpart user ID (chats with this specific user, general + ticket-scoped alike)', required: false, schema: ['type' => 'string', 'format' => 'uuid']),
                ],
            ),
            normalizationContext: ['groups' => G::OPS_CHATS],
        ),
        // Постраничный список сообщений чата — раньше отдавались одним
        // неограниченным массивом прямо в Chat.messages (см. докблок
        // ApiGetChatMessagesController). Возвращает ChatMessage, поэтому
        // normalizationContext — группы ChatMessage (OPS_CHAT_MSGS), а не Chat.
        new GetCollection(
            uriTemplate: '/chats/{id}/messages',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiGetChatMessagesController::class,
            normalizationContext: ['groups' => G::OPS_CHAT_MSGS],
        ),
        new Post(
            uriTemplate: '/chats',
            controller: ApiPostChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
            input: ChatPostInput::class,
        ),
        new Post(
            uriTemplate: '/chats/{id}/read',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPostMarkChatReadController::class,
            deserialize: false,
        ),
        new Patch(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPatchChatController::class,
            normalizationContext: ['groups' => G::OPS_CHATS],
            input: ChatPatchInput::class,
        ),
        new Delete(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
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
        return 'Chat';
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_CHAT,
    ])]
    private ?Uuid $id = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_CHAT,
    ])]
    private ?bool $active = null;

    /**
     * "Удалить чат для меня" (см. ApiDeleteChatController) — участник может
     * скрыть чат из своего собственного списка, не трогая видимость у
     * второй стороны. Когда ОБА флага (hiddenByAuthor и hiddenByReplyAuthor)
     * становятся true — чат реально удаляется (см. ApiDeleteChatController).
     *
     * Без #[Groups] намеренно — служебное поле только для
     * ChatRepository::findUserChats()/ApiDeleteChatController, наружу через
     * API не отдаётся: скрывшему чат нет смысла его показывать (он и так не
     * увидит чат в /chats/me), а показывать второй стороне, что собеседник
     * скрыл переписку у себя — лишняя утечка чужого намерения.
     * ApiProperty(writable: false) — доп. подстраховка от записи через
     * PATCH, хотя ChatPatchInput этих полей и так не содержит.
     */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[ApiProperty(writable: false)]
    private bool $hiddenByAuthor = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[ApiProperty(writable: false)]
    private bool $hiddenByReplyAuthor = false;

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
     *
     * Больше не сериализуется (см. GET /chats/{id}/messages,
     * ApiGetChatMessagesController) — неограниченный массив всех сообщений
     * чата прямо в ответе GET /chats/{id} не масштабировался на длинной
     * переписке. Сама ORM-связь и cascade остаются как есть, нужны
     * addMessage()/removeMessage() и внутренней агрегации в getImages() ниже.
     */
    #[ORM\OneToMany(targetEntity: ChatMessage::class, mappedBy: 'chat', cascade: ['all'])]
    #[Ignore]
    #[ApiProperty(writable: false)]
    private Collection $messages;

    /**
     * Превью последнего сообщения — для списка чатов (инбокса), чтобы фронту
     * не нужно было отдельным запросом на КАЖДЫЙ чат ходить за
     * GET /chats/{id}/messages ради одного превью. НЕ ORM-поле — транзиентное,
     * заполняется контроллером (см. ApiGetMyChatsController/ApiGetChatController)
     * через setLastMessage() из ChatMessageRepository::findLastMessage() —
     * один узкий (LIMIT 1) запрос на чат, а не загрузка Chat::$messages целиком.
     */
    #[Groups([G::CHATS])]
    #[ApiProperty(writable: false)]
    private ?ChatMessage $lastMessage = null;

    /**
     * Бейдж непрочитанных — та же логика: транзиентное поле, заполняется
     * контроллером через ChatMessageRepository::countUnread() (COUNT, а не
     * загрузка самих сообщений).
     */
    #[Groups([G::CHATS])]
    #[ApiProperty(writable: false)]
    private int $unreadCount = 0;

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

    public function getId(): ?Uuid
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

    public function getHiddenByAuthor(): bool
    {
        return $this->hiddenByAuthor;
    }

    public function setHiddenByAuthor(bool $hiddenByAuthor): static
    {
        $this->hiddenByAuthor = $hiddenByAuthor;
        return $this;
    }

    public function getHiddenByReplyAuthor(): bool
    {
        return $this->hiddenByReplyAuthor;
    }

    public function setHiddenByReplyAuthor(bool $hiddenByReplyAuthor): static
    {
        $this->hiddenByReplyAuthor = $hiddenByReplyAuthor;
        return $this;
    }

    public function getLastMessage(): ?ChatMessage
    {
        return $this->lastMessage;
    }

    public function setLastMessage(?ChatMessage $lastMessage): static
    {
        $this->lastMessage = $lastMessage;
        return $this;
    }

    public function getUnreadCount(): int
    {
        return $this->unreadCount;
    }

    public function setUnreadCount(int $unreadCount): static
    {
        $this->unreadCount = $unreadCount;
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
