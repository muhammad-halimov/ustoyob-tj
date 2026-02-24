<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Dto\Image\ImageInput;
use App\Controller\Api\CRUD\Chat\Message\DeleteChatMessageController;
use App\Controller\Api\CRUD\Chat\Message\PatchChatMessageController;
use App\Controller\Api\CRUD\Chat\Message\PostChatMessageController;
use App\Controller\Api\CRUD\Chat\Message\PostChatMessagePhotoController;
use App\Controller\Api\Filter\Chat\ChatMessageFilterController;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ChatMessageRepository::class)]
#[Vich\Uploadable]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/chat-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: ChatMessageFilterController::class,
            normalizationContext: [
                'groups' => ['chatMessages:read'],
                'skip_null_values' => false,
            ],
        ),
        new Post(
            uriTemplate: '/chat-messages',
            controller: PostChatMessageController::class,
            normalizationContext: [
                'groups' => ['chatMessages:read'],
                'skip_null_values' => false,
            ],
        ),
        new Post(
            uriTemplate: '/chat-messages/{id}/upload-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostChatMessagePhotoController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/chat-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchChatMessageController::class,
            normalizationContext: [
                'groups' => ['chatMessages:read'],
                'skip_null_values' => false,
            ],
        ),
        new Delete(
            uriTemplate: '/chat-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: DeleteChatMessageController::class,
        )
    ],
    paginationEnabled: false,
)]
class ChatMessage
{
    public function __toString(): string
    {
        return "MessageID #{$this->id}; ChatID #{$this->chat->getId()}; Text: {$this->text}" ?? "Message #$this->id";
    }

    public function __construct()
    {
        $this->chatMessages = new ArrayCollection();
        $this->chatImages = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    private ?int $id = null;


    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    private ?string $text = null;

    #[ORM\ManyToOne(inversedBy: 'messages')]
    #[Groups([
        'chatMessages:read'
    ])]
    private ?Chat $chat = null;

    #[ORM\ManyToOne(inversedBy: 'chatMessages')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'chatMessages')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    private ?self $replyTo = null;

    /**
     * @var Collection<int, self>
     */
    #[ORM\OneToMany(targetEntity: self::class, mappedBy: 'replyTo')]
    #[Ignore]
    private Collection $chatMessages;

    /**
     * @var Collection<int, ChatImage>
     */
    #[ORM\OneToMany(targetEntity: ChatImage::class, mappedBy: 'chatMessage', cascade: ['all'])]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $chatImages;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    protected DateTime $createdAt;

    #[ORM\Column(type: 'datetime', nullable: false)]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    protected DateTime $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getText(): ?string
    {
        return $this->text;
    }

    public function setText(?string $text): static
    {
        $this->text = $text;

        return $this;
    }

    public function getChat(): ?Chat
    {
        return $this->chat;
    }

    public function setChat(?Chat $chat): static
    {
        $this->chat = $chat;

        return $this;
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

    public function getReplyTo(): ?self
    {
        return $this->replyTo;
    }

    public function setReplyTo(?self $replyTo): static
    {
        $this->replyTo = $replyTo;

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getChatMessages(): Collection
    {
        return $this->chatMessages;
    }

    public function addChatMessage(self $chatMessage): static
    {
        if (!$this->chatMessages->contains($chatMessage)) {
            $this->chatMessages->add($chatMessage);
            $chatMessage->setReplyTo($this);
        }

        return $this;
    }

    public function removeChatMessage(self $chatMessage): static
    {
        if ($this->chatMessages->removeElement($chatMessage)) {
            // set the owning side to null (unless already changed)
            if ($chatMessage->getReplyTo() === $this) {
                $chatMessage->setReplyTo(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ChatImage>
     */
    public function getChatImages(): Collection
    {
        return $this->chatImages;
    }

    public function addChatImage(ChatImage $chatImage): static
    {
        if (!$this->chatImages->contains($chatImage)) {
            $this->chatImages->add($chatImage);
            $chatImage->setChatMessage($this);
        }

        return $this;
    }

    public function removeChatImage(ChatImage $chatImage): static
    {
        if ($this->chatImages->removeElement($chatImage)) {
            if ($chatImage->getChatMessage() === $this) {
                $chatImage->setChatMessage(null);
            }
        }

        return $this;
    }
}
