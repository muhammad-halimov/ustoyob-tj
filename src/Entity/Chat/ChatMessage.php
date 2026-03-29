<?php

namespace App\Entity\Chat;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\DELETE\Chat\Message\ApiDeleteChatMessageController;
use App\Controller\Api\CRUD\GET\Chat\Message\ApiGetChatMessageController;
use App\Controller\Api\CRUD\PATCH\Chat\Message\ApiPatchChatMessageController;
use App\Controller\Api\CRUD\POST\Chat\Message\ApiPostChatMessageController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Dto\Image\ImageInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\UpdatedAtTrait;
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
            controller: ApiGetChatMessageController::class,
            normalizationContext: ['groups' => G::OPS_CHAT_MSGS],
        ),
        new Post(
            uriTemplate: '/chat-messages',
            controller: ApiPostChatMessageController::class,
            normalizationContext: ['groups' => G::OPS_CHAT_MSGS],
        ),
        new Post(
            uriTemplate: '/chat-messages/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: ApiPostUniversalImageController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/chat-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiPatchChatMessageController::class,
            normalizationContext: ['groups' => G::OPS_CHAT_MSGS],
        ),
        new Delete(
            uriTemplate: '/chat-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: ApiDeleteChatMessageController::class,
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
        G::CHATS,
        G::CHAT_MESSAGES
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'messages')]
    #[Groups([
        G::CHAT_MESSAGES
    ])]
    private ?Chat $chat = null;

    #[ORM\ManyToOne(inversedBy: 'chatMessages')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'chatMessages')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES,
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
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::CHATS,
        G::CHAT_MESSAGES
    ])]
    #[ApiProperty(writable: false)]
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
