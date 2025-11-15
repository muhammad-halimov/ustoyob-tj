<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\Filter\Chat\PersonalChatFilterController;
use App\Controller\Api\Filter\Chat\PostChatPhotoController;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ChatRepository::class)]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new GetCollection(
            uriTemplate: '/chats/me',
            controller: PersonalChatFilterController::class,
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/chats/{id}/upload-photo',
            requirements: ['id' => '\d+'],
            controller: PostChatPhotoController::class,
            security:
            "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Post(
            uriTemplate: '/chats',
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Patch(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
        ),
        new Delete(
            uriTemplate: '/chats/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')"
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
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        return "Chat ID: $this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'chats:read',
        'chatMessages:read',
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'messageAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'messageReplyAuthor')]
    #[ORM\JoinColumn(name: 'reply_author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'chats:read',
    ])]
    private ?User $replyAuthor = null;

    /**
     * @var Collection<int, ChatMessage>
     */
    #[ORM\OneToMany(targetEntity: ChatMessage::class, mappedBy: 'chat', cascade: ['all'])]
    #[Groups([
        'chats:read',
    ])]
    #[ApiProperty(writable: false)]
    private Collection $messages;

    /**
     * @var Collection<int, ChatImage>
     */
    #[ORM\OneToMany(targetEntity: ChatImage::class, mappedBy: 'chats')]
    #[Groups([
        'chats:read',
    ])]
    #[SerializedName('images')]
    #[ApiProperty(writable: false)]
    private Collection $chatImages;

    public function __construct()
    {
        $this->messages = new ArrayCollection();
        $this->chatImages = new ArrayCollection();
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
            $chatImage->setChats($this);
        }

        return $this;
    }

    public function removeChatImage(ChatImage $chatImage): static
    {
        if ($this->chatImages->removeElement($chatImage)) {
            // set the owning side to null (unless already changed)
            if ($chatImage->getChats() === $this) {
                $chatImage->setChats(null);
            }
        }

        return $this;
    }
}
