<?php /** @noinspection PhpMultipleClassDeclarationsInspection */

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\User\GrantRoleController;
use App\Controller\Api\CRUD\User\PostUserPhotoController;
use App\Controller\Api\Filter\User\Client\ClientsUserFilterController;
use App\Controller\Api\Filter\User\Client\ClientUserFilterController;
use App\Controller\Api\Filter\User\Master\MastersOccupationUserFilterController;
use App\Controller\Api\Filter\User\Master\MastersUserFilterController;
use App\Controller\Api\Filter\User\Master\MasterUserFilterController;
use App\Controller\Api\Filter\User\Personal\PersonalUserFilterController;
use App\Controller\Api\Filter\User\SocialNetworkController;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\Appeal\AppealMessage;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\Chat\ChatMessage;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\District;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User\Education;
use App\Entity\User\Favorite;
use App\Entity\User\Occupation;
use App\Entity\User\SocialNetwork;
use App\Repository\UserRepository;
use DateTime;
use Deprecated;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[Vich\Uploadable]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/users/me',
            controller: PersonalUserFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/users/clients',
            controller: ClientsUserFilterController::class,
        ),
        new Get(
            uriTemplate: '/users/clients/{id}',
            requirements: ['id' => '\d+'],
            controller: ClientUserFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/users/masters',
            controller: MastersUserFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/users/social-networks',
            controller: SocialNetworkController::class,
        ),
        new Get(
            uriTemplate: '/users/masters/{id}',
            requirements: ['id' => '\d+'],
            controller: MasterUserFilterController::class,
        ),
        new GetCollection(
            uriTemplate: '/users/masters/occupations/{id}',
            requirements: ['id' => '\d+'],
            controller: MastersOccupationUserFilterController::class,
        ),
        new Post(
            uriTemplate: '/users'
        ),
        new Post(
            uriTemplate: '/users/grant-role/',
            controller: GrantRoleController::class,
        ),
        new Post(
            uriTemplate: '/users/{id}/update-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostUserPhotoController::class,
        ),
        new Patch(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 ((is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')) and
                 object == user)",
        ),
        new Delete(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '\d+'],
            security:
                "is_granted('ROLE_ADMIN') or
                 ((is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')) and
                 object == user)",
        )
    ],
    normalizationContext: [
        'groups' => ['masters:read', 'clients:read'],
        'skip_null_values' => false,
    ],
    paginationEnabled: false,
)]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    use UpdatedAtTrait, CreatedAtTrait;

    public const ROLES = [
        'Администратор' => 'ROLE_ADMIN',
        'Мастер' => 'ROLE_MASTER',
        'Клиент' => 'ROLE_CLIENT',
    ];

    public const GENDERS = [
        'Женский' => 'gender_female',
        'Мужской' => 'gender_male',
        'Не указано' => 'gender_neutral',
    ];

    public function __toString(): string
    {
        if($this->name && $this->surname) return "$this->name $this->surname ({$this->getEmail()})";

        return $this->getEmail();
    }

    public function __construct()
    {
        $this->socialNetworks = new ArrayCollection();
        $this->messageAuthor = new ArrayCollection();
        $this->userTickets = new ArrayCollection();
        $this->education = new ArrayCollection();
        $this->chatMessages = new ArrayCollection();
        $this->galleries = new ArrayCollection();
        $this->tickets = new ArrayCollection();
        $this->appeals = new ArrayCollection();
        $this->appealsRespondent = new ArrayCollection();
        $this->favorites = new ArrayCollection();
        $this->administrantAppeals = new ArrayCollection();
        $this->appealMessages = new ArrayCollection();
        $this->chatImages = new ArrayCollection();
        $this->appealImages = new ArrayCollection();
        $this->masterReviews = new ArrayCollection();
        $this->clientReviews = new ArrayCollection();
        $this->districts = new ArrayCollection();
        $this->occupation = new ArrayCollection();
        $this->clientsFavorites = new ArrayCollection();
        $this->mastersFavorites = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'clients:read',
        'reviews:read',
        'reviewsClient:read',
        'galleries:read',
        'masterTickets:read',
        'clientTickets:read',
        'chats:read',
        'chatMessages:read',
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
        'favorites:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Groups([
        'masters:read',
        'clients:read',
        'reviews:read',
        'reviewsClient:read',
        'galleries:read',
        'masterTickets:read',
        'clientTickets:read',
        'chats:read',
        'chatMessages:read',
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
        'favorites:read',
    ])]
    private ?string $email = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'reviews:read',
        'reviewsClient:read',
        'galleries:read',
        'masterTickets:read',
        'clientTickets:read',
        'chats:read',
        'chatMessages:read',
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
        'favorites:read',
    ])]
    private ?string $name = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'reviews:read',
        'reviewsClient:read',
        'galleries:read',
        'masterTickets:read',
        'clientTickets:read',
        'chats:read',
        'chatMessages:read',
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
        'favorites:read',
    ])]
    private ?string $surname = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $patronymic = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $bio = null;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?float $rating = null;

    #[ORM\Column(length: 16, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $gender = null;

    #[Vich\UploadableField(mapping: 'profile_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    private ?File $imageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'reviews:read',
        'reviewsClient:read',
        'galleries:read',
        'masterTickets:read',
        'clientTickets:read',
        'chats:read',
        'chatMessages:read',
        'appeals:read',
        'appealsTicket:read',
        'appealsSupport:read',
        'favorites:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $phone1 = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?string $phone2 = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?bool $remotely = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    #[ApiProperty(writable: false)]
    private array $roles = [];

    /**
     * @var string|null The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[Ignore]
    private ?string $plainPassword = null;

    /**
     * @var Collection<int, SocialNetwork>
     */
    #[ORM\OneToMany(targetEntity: SocialNetwork::class, mappedBy: 'user', cascade: ['all'])]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private Collection $socialNetworks;

    /**
     * @var Collection<int, Chat>
     */
    #[ORM\OneToMany(targetEntity: Chat::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $messageAuthor;

    /**
     * @var Collection<int, Chat>
     */
    #[ORM\OneToMany(targetEntity: Chat::class, mappedBy: 'replyAuthor')]
    #[Ignore]
    private Collection $messageReplyAuthor;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $userTickets;

    /**
     * @var Collection<int, Education>
     */
    #[ORM\OneToMany(targetEntity: Education::class, mappedBy: 'user', cascade: ['all'])]
    #[Groups([
        'masters:read',
    ])]
    private Collection $education;

    /**
     * @var Collection<int, ChatMessage>
     */
    #[ORM\OneToMany(targetEntity: ChatMessage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $chatMessages;

    /**
     * @var Collection<int, Gallery>
     */
    #[ORM\OneToMany(targetEntity: Gallery::class, mappedBy: 'user')]
    #[Ignore]
    private Collection $galleries;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'master')]
    #[Ignore]
    private Collection $tickets;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'author')]
    #[ApiProperty(writable: false)]
    private Collection $appeals;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'respondent')]
    #[ApiProperty(writable: false)]
    private Collection $appealsRespondent;

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\OneToMany(targetEntity: Favorite::class, mappedBy: 'user')]
    #[ApiProperty(writable: false)]
    private Collection $favorites;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'administrant')]
    #[Ignore]
    private Collection $administrantAppeals;

    /**
     * @var Collection<int, AppealMessage>
     */
    #[ORM\OneToMany(targetEntity: AppealMessage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $appealMessages;

    /**
     * @var Collection<int, ChatImage>
     */
    #[ORM\OneToMany(targetEntity: ChatImage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $chatImages;

    /**
     * @var Collection<int, AppealImage>
     */
    #[ORM\OneToMany(targetEntity: AppealImage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $appealImages;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'master')]
    #[Ignore]
    private Collection $masterReviews;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'client')]
    #[Ignore]
    private Collection $clientReviews;

    /**
     * @var Collection<int, District>
     */
    #[ORM\ManyToMany(targetEntity: District::class, mappedBy: 'user')]
    #[Groups([
        'masters:read',
    ])]
    private Collection $districts;

    /**
     * @var Collection<int, Occupation>
     */
    #[ORM\ManyToMany(targetEntity: Occupation::class, mappedBy: 'master')]
    #[Groups([
        'masters:read',
    ])]
    private Collection $occupation;

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\ManyToMany(targetEntity: Favorite::class, mappedBy: 'clients')]
    #[Ignore]
    private Collection $clientsFavorites;

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\ManyToMany(targetEntity: Favorite::class, mappedBy: 'masters')]
    #[Ignore]
    private Collection $mastersFavorites;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): User
    {
        $this->name = $name;
        return $this;
    }

    public function getSurname(): ?string
    {
        return $this->surname;
    }

    public function setSurname(?string $surname): User
    {
        $this->surname = $surname;
        return $this;
    }

    public function getPatronymic(): ?string
    {
        return $this->patronymic;
    }

    public function setPatronymic(?string $patronymic): User
    {
        $this->patronymic = $patronymic;
        return $this;
    }

    public function getBio(): ?string
    {
        return strip_tags($this->bio);
    }

    public function setBio(?string $bio): User
    {
        $this->bio = $bio;
        return $this;
    }

    public function getRating(): ?float
    {
        return $this->rating;
    }

    public function setRating(?float $rating): User
    {
        $this->rating = $rating;
        return $this;
    }

    public function getGender(): ?string
    {
        return $this->gender;
    }

    public function setGender(?string $gender): User
    {
        $this->gender = $gender;
        return $this;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;

        return $this;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): self
    {
        $this->imageFile = $imageFile;
        if (null !== $imageFile) {
            $this->updatedAt = new DateTime();
        }

        return $this;
    }

    public function getPhone1(): ?string
    {
        return $this->phone1;
    }

    public function setPhone1(?string $phone1): User
    {
        $this->phone1 = $phone1;
        return $this;
    }

    public function getPhone2(): ?string
    {
        return $this->phone2;
    }

    public function setPhone2(?string $phone2): User
    {
        $this->phone2 = $phone2;
        return $this;
    }

    public function getRemotely(): ?bool
    {
        return $this->remotely;
    }

    public function setRemotely(?bool $remotely): void
    {
        $this->remotely = $remotely;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): static
    {
        $this->password = $password;

        return $this;
    }

    /**
     * @return string|null
     */
    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    /**
     * @param string|null $plainPassword
     */
    public function setPlainPassword(?string $plainPassword): void
    {
        $this->plainPassword = $plainPassword;
    }

    /**
     * Ensure the session doesn't contain actual password hashes by CRC32C-hashing them, as supported since Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);

        return $data;
    }

    #[Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }

    /**
     * @return Collection<int, SocialNetwork>
     */
    public function getSocialNetworks(): Collection
    {
        return $this->socialNetworks;
    }

    public function addSocialNetwork(SocialNetwork $socialNetwork): static
    {
        if (!$this->socialNetworks->contains($socialNetwork)) {
            $this->socialNetworks->add($socialNetwork);
            $socialNetwork->setUser($this);
        }

        return $this;
    }

    public function removeSocialNetwork(SocialNetwork $socialNetwork): static
    {
        if ($this->socialNetworks->removeElement($socialNetwork)) {
            // set the owning side to null (unless already changed)
            if ($socialNetwork->getUser() === $this) {
                $socialNetwork->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getMessageAuthor(): Collection
    {
        return $this->messageAuthor;
    }

    public function addMessageAuthor(Chat $chat): static
    {
        if (!$this->messageAuthor->contains($chat)) {
            $this->messageAuthor->add($chat);
            $chat->setAuthor($this);
        }

        return $this;
    }

    public function removeMessageAuthor(Chat $chat): static
    {
        if ($this->messageAuthor->removeElement($chat)) {
            // set the owning side to null (unless already changed)
            if ($chat->getAuthor() === $this) {
                $chat->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getMessageReplyAuthor(): Collection
    {
        return $this->messageReplyAuthor;
    }

    public function addMessageReplyAuthor(Chat $chat): static
    {
        if (!$this->messageReplyAuthor->contains($chat)) {
            $this->messageReplyAuthor->add($chat);
            $chat->setReplyAuthor($this);
        }

        return $this;
    }

    public function removeMessageReplyAuthor(Chat $chat): static
    {
        if ($this->messageReplyAuthor->removeElement($chat)) {
            // set the owning side to null (unless already changed)
            if ($chat->getReplyAuthor() === $this) {
                $chat->setReplyAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Ticket>
     */
    public function getUserTickets(): Collection
    {
        return $this->userTickets;
    }

    public function addUserTicket(Ticket $userTicket): static
    {
        if (!$this->userTickets->contains($userTicket)) {
            $this->userTickets->add($userTicket);
            $userTicket->setAuthor($this);
        }

        return $this;
    }

    public function removeUserTicket(Ticket $userTicket): static
    {
        if ($this->userTickets->removeElement($userTicket)) {
            // set the owning side to null (unless already changed)
            if ($userTicket->getAuthor() === $this) {
                $userTicket->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Education>
     */
    public function getEducation(): Collection
    {
        return $this->education;
    }

    public function addEducation(Education $education): static
    {
        if (!$this->education->contains($education)) {
            $this->education->add($education);
            $education->setUser($this);
        }

        return $this;
    }

    public function removeEducation(Education $education): static
    {
        if ($this->education->removeElement($education)) {
            // set the owning side to null (unless already changed)
            if ($education->getUser() === $this) {
                $education->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ChatMessage>
     */
    public function getChatMessages(): Collection
    {
        return $this->chatMessages;
    }

    public function addChatMessage(ChatMessage $chatMessage): static
    {
        if (!$this->chatMessages->contains($chatMessage)) {
            $this->chatMessages->add($chatMessage);
            $chatMessage->setAuthor($this);
        }

        return $this;
    }

    public function removeChatMessage(ChatMessage $chatMessage): static
    {
        if ($this->chatMessages->removeElement($chatMessage)) {
            // set the owning side to null (unless already changed)
            if ($chatMessage->getAuthor() === $this) {
                $chatMessage->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Gallery>
     */
    public function getGalleries(): Collection
    {
        return $this->galleries;
    }

    public function addGallery(Gallery $gallery): static
    {
        if (!$this->galleries->contains($gallery)) {
            $this->galleries->add($gallery);
            $gallery->setUser($this);
        }

        return $this;
    }

    public function removeGallery(Gallery $gallery): static
    {
        if ($this->galleries->removeElement($gallery)) {
            // set the owning side to null (unless already changed)
            if ($gallery->getUser() === $this) {
                $gallery->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Ticket>
     */
    public function getTickets(): Collection
    {
        return $this->tickets;
    }

    public function addTicket(Ticket $ticket): static
    {
        if (!$this->tickets->contains($ticket)) {
            $this->tickets->add($ticket);
            $ticket->setMaster($this);
        }

        return $this;
    }

    public function removeTicket(Ticket $ticket): static
    {
        if ($this->tickets->removeElement($ticket)) {
            // set the owning side to null (unless already changed)
            if ($ticket->getMaster() === $this) {
                $ticket->setMaster(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Appeal>
     */
    public function getAppeals(): Collection
    {
        return $this->appeals;
    }

    public function addAppeal(Appeal $appeal): static
    {
        if (!$this->appeals->contains($appeal)) {
            $this->appeals->add($appeal);
            $appeal->setAuthor($this);
        }

        return $this;
    }

    public function removeAppeal(Appeal $appeal): static
    {
        if ($this->appeals->removeElement($appeal)) {
            // set the owning side to null (unless already changed)
            if ($appeal->getAuthor() === $this) {
                $appeal->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Appeal>
     */
    public function getAppealsRespondent(): Collection
    {
        return $this->appealsRespondent;
    }

    public function addAppealsRespondent(Appeal $appealsRespondent): static
    {
        if (!$this->appealsRespondent->contains($appealsRespondent)) {
            $this->appealsRespondent->add($appealsRespondent);
            $appealsRespondent->setRespondent($this);
        }

        return $this;
    }

    public function removeAppealsRespondent(Appeal $appealsRespondent): static
    {
        if ($this->appealsRespondent->removeElement($appealsRespondent)) {
            // set the owning side to null (unless already changed)
            if ($appealsRespondent->getRespondent() === $this) {
                $appealsRespondent->setRespondent(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getFavorites(): Collection
    {
        return $this->favorites;
    }

    public function addFavorite(Favorite $favorite): static
    {
        if (!$this->favorites->contains($favorite)) {
            $this->favorites->add($favorite);
            $favorite->setUser($this);
        }

        return $this;
    }

    public function removeFavorite(Favorite $favorite): static
    {
        if ($this->favorites->removeElement($favorite)) {
            // set the owning side to null (unless already changed)
            if ($favorite->getUser() === $this) {
                $favorite->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Appeal>
     */
    public function getAdministrantAppeals(): Collection
    {
        return $this->administrantAppeals;
    }

    public function addAdministrantAppeal(Appeal $administrantAppeal): static
    {
        if (!$this->administrantAppeals->contains($administrantAppeal)) {
            $this->administrantAppeals->add($administrantAppeal);
            $administrantAppeal->setAdministrant($this);
        }

        return $this;
    }

    public function removeAdministrantAppeal(Appeal $administrantAppeal): static
    {
        if ($this->administrantAppeals->removeElement($administrantAppeal)) {
            // set the owning side to null (unless already changed)
            if ($administrantAppeal->getAdministrant() === $this) {
                $administrantAppeal->setAdministrant(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealMessage>
     */
    public function getAppealMessages(): Collection
    {
        return $this->appealMessages;
    }

    public function addAppealMessage(AppealMessage $appealMessage): static
    {
        if (!$this->appealMessages->contains($appealMessage)) {
            $this->appealMessages->add($appealMessage);
            $appealMessage->setAuthor($this);
        }

        return $this;
    }

    public function removeAppealMessage(AppealMessage $appealMessage): static
    {
        if ($this->appealMessages->removeElement($appealMessage)) {
            // set the owning side to null (unless already changed)
            if ($appealMessage->getAuthor() === $this) {
                $appealMessage->setAuthor(null);
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
            $chatImage->setAuthor($this);
        }

        return $this;
    }

    public function removeChatImage(ChatImage $chatImage): static
    {
        if ($this->chatImages->removeElement($chatImage)) {
            // set the owning side to null (unless already changed)
            if ($chatImage->getAuthor() === $this) {
                $chatImage->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealImage>
     */
    public function getAppealImages(): Collection
    {
        return $this->appealImages;
    }

    public function addAppealImage(AppealImage $appealImage): static
    {
        if (!$this->appealImages->contains($appealImage)) {
            $this->appealImages->add($appealImage);
            $appealImage->setAuthor($this);
        }

        return $this;
    }

    public function removeAppealImage(AppealImage $appealImage): static
    {
        if ($this->appealImages->removeElement($appealImage)) {
            // set the owning side to null (unless already changed)
            if ($appealImage->getAuthor() === $this) {
                $appealImage->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Review>
     */
    public function getMasterReviews(): Collection
    {
        return $this->masterReviews;
    }

    public function addMasterReview(Review $masterReview): static
    {
        if (!$this->masterReviews->contains($masterReview)) {
            $this->masterReviews->add($masterReview);
            $masterReview->setMaster($this);
        }

        return $this;
    }

    public function removeMasterReview(Review $masterReview): static
    {
        if ($this->masterReviews->removeElement($masterReview)) {
            // set the owning side to null (unless already changed)
            if ($masterReview->getMaster() === $this) {
                $masterReview->setMaster(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Review>
     */
    public function getClientReviews(): Collection
    {
        return $this->clientReviews;
    }

    public function addClientReview(Review $clientReview): static
    {
        if (!$this->clientReviews->contains($clientReview)) {
            $this->clientReviews->add($clientReview);
            $clientReview->setClient($this);
        }

        return $this;
    }

    public function removeClientReview(Review $clientReview): static
    {
        if ($this->clientReviews->removeElement($clientReview)) {
            // set the owning side to null (unless already changed)
            if ($clientReview->getClient() === $this) {
                $clientReview->setClient(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, District>
     */
    public function getDistricts(): Collection
    {
        return $this->districts;
    }

    public function addDistrict(District $district): static
    {
        if (!$this->districts->contains($district)) {
            $this->districts->add($district);
            $district->addUser($this);
        }

        return $this;
    }

    public function removeDistrict(District $district): static
    {
        if ($this->districts->removeElement($district)) {
            $district->removeUser($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, Occupation>
     */
    public function getOccupation(): Collection
    {
        return $this->occupation;
    }

    public function addOccupation(Occupation $occupation): static
    {
        if (!$this->occupation->contains($occupation)) {
            $this->occupation->add($occupation);
            $occupation->addMaster($this);
        }

        return $this;
    }

    public function removeOccupation(Occupation $occupation): static
    {
        if ($this->occupation->removeElement($occupation)) {
            $occupation->removeMaster($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getClientsFavorites(): Collection
    {
        return $this->clientsFavorites;
    }

    public function addClientsFavorite(Favorite $clientsFavorite): static
    {
        if (!$this->clientsFavorites->contains($clientsFavorite)) {
            $this->clientsFavorites->add($clientsFavorite);
            $clientsFavorite->addClient($this);
        }

        return $this;
    }

    public function removeClientsFavorite(Favorite $clientsFavorite): static
    {
        if ($this->clientsFavorites->removeElement($clientsFavorite)) {
            $clientsFavorite->removeClient($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getMastersFavorites(): Collection
    {
        return $this->mastersFavorites;
    }

    public function addMastersFavorite(Favorite $mastersFavorite): static
    {
        if (!$this->mastersFavorites->contains($mastersFavorite)) {
            $this->mastersFavorites->add($mastersFavorite);
            $mastersFavorite->addMaster($this);
        }

        return $this;
    }

    public function removeMastersFavorite(Favorite $mastersFavorite): static
    {
        if ($this->mastersFavorites->removeElement($mastersFavorite)) {
            $mastersFavorite->removeMaster($this);
        }

        return $this;
    }
}
