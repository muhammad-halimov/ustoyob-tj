<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\DELETE\Chat\Message\DeleteChatMessageController;
use App\Controller\Api\CRUD\GET\Chat\ChatMessageFilterController;
use App\Controller\Api\CRUD\PATCH\Chat\Message\PatchChatMessageController;
use App\Controller\Api\CRUD\POST\Chat\Message\PostChatMessageController;
use App\Controller\Api\CRUD\POST\Chat\Message\PostChatMessagePhotoController;
use App\Dto\Image\ImageInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\DescriptionTrait;
use App\Entity\Trait\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
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
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class ChatMessage
{
    use CreatedAtTrait, UpdatedAtTrait, DescriptionTrait;

    public function __construct()
    {
        $this->chatMessages = new ArrayCollection();
        $this->images = new ArrayCollection();
    }

    public function __toString(): string
    {
        return "MessageID #{$this->id}; ChatID #{$this->chat->getId()}; Text: {$this->description}" ?? "ChatMessage #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    private ?int $id = null;

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
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'chatMessage')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    #[Groups([
        'chats:read',
        'chatMessages:read'
    ])]
    private Collection $images;

    public function getId(): ?int
    {
        return $this->id;
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
     * @return Collection<int, MultipleImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setChatMessage($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getChatMessage() === $this) {
                $image->setChatMessage(null);
            }
        }

        return $this;
    }
}
