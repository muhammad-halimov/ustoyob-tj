<?php /** @noinspection PhpMultipleClassDeclarationsInspection */

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\User\User\ConfirmAccountController;
use App\Controller\Api\CRUD\User\User\ConfirmAccountTokenlessController;
use App\Controller\Api\CRUD\User\User\GrantRoleController;
use App\Controller\Api\CRUD\User\User\PostUserPhotoController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Controller\Api\Filter\User\PersonalUserFilterController;
use App\Controller\Api\Filter\User\RolesFilter;
use App\Controller\Api\Filter\User\SocialNetworkController;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Dto\User\AccountConfirmInput;
use App\Dto\User\AccountConfirmOutput;
use App\Dto\User\RoleOutput;
use App\Dto\User\SocialNetworkOutput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\Chat\ChatMessage;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\Address;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportImage;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User\BlackList;
use App\Entity\User\Education;
use App\Entity\User\Favorite;
use App\Entity\User\OAuthType;
use App\Entity\User\Occupation;
use App\Entity\User\SocialNetwork;
use App\Repository\UserRepository;
use App\Validator\Constraints as AppAssert;
use DateTime;
use Deprecated;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[Vich\Uploadable]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/users/social-networks',
            controller: SocialNetworkController::class,
            output: SocialNetworkOutput::class,
        ),
        new Get(
            uriTemplate: '/users/me',
            controller: PersonalUserFilterController::class,
            normalizationContext: [
                'groups' => ['masters:read', 'clients:read', 'users:me:read'],
                'skip_null_values' => false,
            ],
        ),
        new Get(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: [
                'groups' => ['clients:read', 'masters:read'],
                'skip_null_values' => false,
            ],
        ),
        new GetCollection(
            uriTemplate: '/users',
            normalizationContext: [
                'groups' => ['clients:read', 'masters:read'],
                'skip_null_values' => false,
            ],
        ),
        new Post(
            uriTemplate: '/users',
        ),
        new Post(
            uriTemplate: '/users/grant-role',
            controller: GrantRoleController::class,
            input: RoleOutput::class,
        ),
        new Post(
            uriTemplate: '/confirm-account/',
            controller: ConfirmAccountController::class,
            input: AccountConfirmInput::class,
            output: AccountConfirmOutput::class,
        ),
        new Post(
            uriTemplate: '/confirm-account-tokenless/',
            controller: ConfirmAccountTokenlessController::class,
            input: false,
            output: AccountConfirmOutput::class,
        ),
        new Post(
            uriTemplate: '/users/{id}/update-photo',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: PostUserPhotoController::class,
            input: AppealPhotoInput::class,
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
    paginationEnabled: false,
)]
#[ApiFilter(BooleanFilter::class, properties: ['active', 'atHome'])]
#[ApiFilter(RangeFilter::class, properties: ['rating'])]
#[ApiFilter(SearchFilter::class, properties: ['occupation', 'gender', 'socialNetworks'])]
#[ApiFilter(AddressFilter::class)]
#[ApiFilter(RolesFilter::class)]
#[ApiFilter(ExistsFilter::class, properties: ['image', 'phone1', 'phone2'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    use UpdatedAtTrait, CreatedAtTrait;

    public const array ROLES = [
        'Администратор' => 'ROLE_ADMIN',
        'Мастер' => 'ROLE_MASTER',
        'Клиент' => 'ROLE_CLIENT',
    ];

    public const array GENDERS = [
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
        $this->favorites = new ArrayCollection();
        $this->chatImages = new ArrayCollection();
        $this->masterReviews = new ArrayCollection();
        $this->clientReviews = new ArrayCollection();
        $this->occupation = new ArrayCollection();
        $this->clientsFavorites = new ArrayCollection();
        $this->mastersFavorites = new ArrayCollection();
        $this->techSupportImages = new ArrayCollection();
        $this->techSupportMessages = new ArrayCollection();
        $this->techSupports = new ArrayCollection();
        $this->techSupportsAsAuthor = new ArrayCollection();
        $this->appealTickets = new ArrayCollection();
        $this->appealTicketsAsRespondent = new ArrayCollection();
        $this->appealChats = new ArrayCollection();
        $this->appealChatsAsRespondent = new ArrayCollection();
        $this->addresses = new ArrayCollection();
        $this->blackLists = new ArrayCollection();
        $this->clientsBlackListedByAuthor = new ArrayCollection();
        $this->mastersBlackListedByAuthor = new ArrayCollection();
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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
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
        'masterTickets:read',
        'clientTickets:read',
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    #[Assert\LessThanOrEqual(value: 5, message: 'Field cannot be greater than 5')]
    private ?float $rating = null;

    #[ORM\Column(length: 16, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'blackLists:read'
    ])]
    private ?string $gender = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?DateTime $dateOfBirth = null;

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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
    ])]
    #[ApiProperty(writable: false)]
    private ?string $image = null;

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
        'appeal:ticket:read',
        'favorites:read',
        'techSupport:read',
        'blackLists:read'
    ])]
    #[ApiProperty(writable: false)]
    private ?string $imageExternalUrl = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read'
    ])]
    #[AppAssert\PhoneConstraint]
    #[Assert\Length(
        max: 20,
        maxMessage: 'Phone number cannot be longer than {{ limit }} characters'
    )]
    private ?string $phone1 = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read'
    ])]
    #[Assert\Length(
        max: 20,
        maxMessage: 'Phone number cannot be longer than {{ limit }} characters'
    )]
    private ?string $phone2 = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private ?bool $atHome = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $telegramChatId = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?bool $active = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?bool $approved = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    #[Groups([
        'masters:read',
        'clients:read',
        'blackLists:read'
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
     * @var Collection<int, Favorite>
     */
    #[ORM\OneToMany(targetEntity: Favorite::class, mappedBy: 'user')]
    #[ApiProperty(writable: false)]
    private Collection $favorites;

    /**
     * @var Collection<int, ChatImage>
     */
    #[ORM\OneToMany(targetEntity: ChatImage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $chatImages;

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

    /**
     * @var Collection<int, TechSupportImage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportImage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $techSupportImages;

    /**
     * @var Collection<int, TechSupportMessage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportMessage::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $techSupportMessages;

    /**
     * @var Collection<int, TechSupport>
     */
    #[ORM\OneToMany(targetEntity: TechSupport::class, mappedBy: 'administrant')]
    #[Ignore]
    private Collection $techSupports;

    /**
     * @var Collection<int, TechSupport>
     */
    #[ORM\OneToMany(targetEntity: TechSupport::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $techSupportsAsAuthor;

    /**
     * @var Collection<int, AppealTicket>
     */
    #[ORM\OneToMany(targetEntity: AppealTicket::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $appealTickets;

    /**
     * @var Collection<int, AppealTicket>
     */
    #[ORM\OneToMany(targetEntity: AppealTicket::class, mappedBy: 'respondent')]
    #[Ignore]
    private Collection $appealTicketsAsRespondent;

    /**
     * @var Collection<int, AppealChat>
     */
    #[ORM\OneToMany(targetEntity: AppealChat::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $appealChats;

    /**
     * @var Collection<int, AppealChat>
     */
    #[ORM\OneToMany(targetEntity: AppealChat::class, mappedBy: 'respondent')]
    #[Ignore]
    private Collection $appealChatsAsRespondent;

    /**
     * @var Collection<int, Address>
     */
    #[ORM\ManyToMany(targetEntity: Address::class, mappedBy: 'users', cascade: ['persist'])]
    #[Groups([
        'masters:read',
        'clients:read',
    ])]
    private Collection $addresses;

    /**
     * @var Collection<int, BlackList>
     */
    #[ORM\OneToMany(targetEntity: BlackList::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $blackLists;

    /**
     * @var Collection<int, BlackList>
     */
    #[ORM\ManyToMany(targetEntity: BlackList::class, mappedBy: 'clients')]
    #[Ignore]
    private Collection $clientsBlackListedByAuthor;

    /**
     * @var Collection<int, BlackList>
     */
    #[ORM\ManyToMany(targetEntity: BlackList::class, mappedBy: 'masters')]
    #[Ignore]
    private Collection $mastersBlackListedByAuthor;

    #[ORM\OneToOne(targetEntity: OAuthType::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    #[Groups([
        'users:me:read'
    ])]
    private ?OAuthType $oauthType = null;

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

    public function getImageExternalUrl(): ?string
    {
        return $this->imageExternalUrl;
    }

    public function setImageExternalUrl(?string $imageExternalUrl): static
    {
        $this->imageExternalUrl = $imageExternalUrl;

        return $this;
    }

    public function getPhone1(): ?string
    {
        return $this->phone1;
    }

    public function setPhone1(?string $phone1): static
    {
        // Нормализуем при сохранении
        if ($phone1) {
            $cleaned = preg_replace('/[^\d+]/', '', $phone1);
            // Добавляем +992 если нет
            if (!str_starts_with($cleaned, '+992')) {
                $cleaned = '+992' . $cleaned;
            }
            $this->phone1 = $cleaned;
        } else {
            $this->phone1 = null;
        }

        return $this;
    }

    public function getPhone2(): ?string
    {
        return $this->phone2;
    }

    public function setPhone2(?string $phone2): static
    {
        $this->phone2 = $phone2;

        return $this;
    }

    public function getAtHome(): ?bool
    {
        return $this->atHome;
    }

    public function setAtHome(?bool $atHome): static
    {
        $this->atHome = $atHome;

        return $this;
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

    /**
     * @return Collection<int, TechSupportImage>
     */
    public function getTechSupportImages(): Collection
    {
        return $this->techSupportImages;
    }

    public function addTechSupportImage(TechSupportImage $techSupportImage): static
    {
        if (!$this->techSupportImages->contains($techSupportImage)) {
            $this->techSupportImages->add($techSupportImage);
            $techSupportImage->setAuthor($this);
        }

        return $this;
    }

    public function removeTechSupportImage(TechSupportImage $techSupportImage): static
    {
        if ($this->techSupportImages->removeElement($techSupportImage)) {
            // set the owning side to null (unless already changed)
            if ($techSupportImage->getAuthor() === $this) {
                $techSupportImage->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, TechSupportMessage>
     */
    public function getTechSupportMessages(): Collection
    {
        return $this->techSupportMessages;
    }

    public function addTechSupportMessage(TechSupportMessage $techSupportMessage): static
    {
        if (!$this->techSupportMessages->contains($techSupportMessage)) {
            $this->techSupportMessages->add($techSupportMessage);
            $techSupportMessage->setAuthor($this);
        }

        return $this;
    }

    public function removeTechSupportMessage(TechSupportMessage $techSupportMessage): static
    {
        if ($this->techSupportMessages->removeElement($techSupportMessage)) {
            // set the owning side to null (unless already changed)
            if ($techSupportMessage->getAuthor() === $this) {
                $techSupportMessage->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, TechSupport>
     */
    public function getTechSupports(): Collection
    {
        return $this->techSupports;
    }

    public function addTechSupport(TechSupport $techSupport): static
    {
        if (!$this->techSupports->contains($techSupport)) {
            $this->techSupports->add($techSupport);
            $techSupport->setAdministrant($this);
        }

        return $this;
    }

    public function removeTechSupport(TechSupport $techSupport): static
    {
        if ($this->techSupports->removeElement($techSupport)) {
            // set the owning side to null (unless already changed)
            if ($techSupport->getAdministrant() === $this) {
                $techSupport->setAdministrant(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, TechSupport>
     */
    public function getTechSupportsAsAuthor(): Collection
    {
        return $this->techSupportsAsAuthor;
    }

    public function addTechSupportAsAuthor(TechSupport $techSupport): static
    {
        if (!$this->techSupportsAsAuthor->contains($techSupport)) {
            $this->techSupportsAsAuthor->add($techSupport);
            $techSupport->setAuthor($this);
        }

        return $this;
    }

    public function removeTechSupportAsAuthor(TechSupport $techSupport): static
    {
        if ($this->techSupportsAsAuthor->removeElement($techSupport)) {
            if ($techSupport->getAuthor() === $this) {
                $techSupport->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealTicket>
     */
    public function getAppealTickets(): Collection
    {
        return $this->appealTickets;
    }

    public function addAppealTicket(AppealTicket $appealTicket): static
    {
        if (!$this->appealTickets->contains($appealTicket)) {
            $this->appealTickets->add($appealTicket);
            $appealTicket->setAuthor($this);
        }

        return $this;
    }

    public function removeAppealTicket(AppealTicket $appealTicket): static
    {
        if ($this->appealTickets->removeElement($appealTicket)) {
            // set the owning side to null (unless already changed)
            if ($appealTicket->getAuthor() === $this) {
                $appealTicket->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealTicket>
     */
    public function getAppealTicketsAsRespondent(): Collection
    {
        return $this->appealTicketsAsRespondent;
    }

    public function addAppealTicketAsRespondent(AppealTicket $appealTicket): static
    {
        if (!$this->appealTicketsAsRespondent->contains($appealTicket)) {
            $this->appealTicketsAsRespondent->add($appealTicket);
            $appealTicket->setRespondent($this);
        }

        return $this;
    }

    public function removeAppealTicketAsRespondent(AppealTicket $appealTicket): static
    {
        if ($this->appealTicketsAsRespondent->removeElement($appealTicket)) {
            if ($appealTicket->getRespondent() === $this) {
                $appealTicket->setRespondent(null);
            }
        }

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
            $appealChat->setAuthor($this);
        }

        return $this;
    }

    public function removeAppealChat(AppealChat $appealChat): static
    {
        if ($this->appealChats->removeElement($appealChat)) {
            // set the owning side to null (unless already changed)
            if ($appealChat->getAuthor() === $this) {
                $appealChat->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, AppealChat>
     */
    public function getAppealChatsAsRespondent(): Collection
    {
        return $this->appealChatsAsRespondent;
    }

    public function addAppealChatAsRespondent(AppealChat $appealChat): static
    {
        if (!$this->appealChatsAsRespondent->contains($appealChat)) {
            $this->appealChatsAsRespondent->add($appealChat);
            $appealChat->setRespondent($this);
        }

        return $this;
    }

    public function removeAppealChatAsRespondent(AppealChat $appealChat): static
    {
        if ($this->appealChatsAsRespondent->removeElement($appealChat)) {
            if ($appealChat->getRespondent() === $this) {
                $appealChat->setRespondent(null);
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

    public function getApproved(): ?bool
    {
        return $this->approved;
    }

    public function setApproved(?bool $approved): static
    {
        $this->approved = $approved;
        return $this;
    }

    public function getTelegramChatId(): ?string
    {
        return $this->telegramChatId;
    }

    public function setTelegramChatId(?string $telegramChatId): static
    {
        $this->telegramChatId = $telegramChatId;
        return $this;
    }

    /**
     * @return Collection<int, Address>
     */
    public function getAddresses(): Collection
    {
        return $this->addresses;
    }

    public function addAddress(Address $address): static
    {
        if (!$this->addresses->contains($address)) {
            $this->addresses->add($address);
            $address->addUser($this);
        }

        return $this;
    }

    public function removeAddress(Address $address): static
    {
        if ($this->addresses->removeElement($address)) {
            $address->removeUser($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, BlackList>
     */
    public function getBlackLists(): Collection
    {
        return $this->blackLists;
    }

    public function addBlackList(BlackList $blackList): static
    {
        if (!$this->blackLists->contains($blackList)) {
            $this->blackLists->add($blackList);
            $blackList->setAuthor($this);
        }

        return $this;
    }

    public function removeBlackList(BlackList $blackList): static
    {
        if ($this->blackLists->removeElement($blackList)) {
            // set the owning side to null (unless already changed)
            if ($blackList->getAuthor() === $this) {
                $blackList->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, BlackList>
     */
    public function getClientsBlackListedByAuthor(): Collection
    {
        return $this->clientsBlackListedByAuthor;
    }

    public function addClientsBlackListedByAuthor(BlackList $clientsBlackListedByAuthor): static
    {
        if (!$this->clientsBlackListedByAuthor->contains($clientsBlackListedByAuthor)) {
            $this->clientsBlackListedByAuthor->add($clientsBlackListedByAuthor);
            $clientsBlackListedByAuthor->addClient($this);
        }

        return $this;
    }

    public function removeClientsBlackListedByAuthor(BlackList $clientsBlackListedByAuthor): static
    {
        if ($this->clientsBlackListedByAuthor->removeElement($clientsBlackListedByAuthor)) {
            $clientsBlackListedByAuthor->removeClient($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, BlackList>
     */
    public function getMastersBlackListedByAuthor(): Collection
    {
        return $this->mastersBlackListedByAuthor;
    }

    public function addMastersBlackListedByAuthor(BlackList $mastersBlackListedByAuthor): static
    {
        if (!$this->mastersBlackListedByAuthor->contains($mastersBlackListedByAuthor)) {
            $this->mastersBlackListedByAuthor->add($mastersBlackListedByAuthor);
            $mastersBlackListedByAuthor->addMaster($this);
        }

        return $this;
    }

    public function removeMastersBlackListedByAuthor(BlackList $mastersBlackListedByAuthor): static
    {
        if ($this->mastersBlackListedByAuthor->removeElement($mastersBlackListedByAuthor)) {
            $mastersBlackListedByAuthor->removeMaster($this);
        }

        return $this;
    }

    public function getOauthType(): ?OAuthType
    {
        return $this->oauthType;
    }

    public function setOauthType(OAuthType $oauthType): static
    {
        $this->oauthType = $oauthType;

        // синхронизация обратной связи
        if ($oauthType->getUser() !== $this) {
            $oauthType->setUser($this);
        }

        return $this;
    }

    public function getDateOfBirth(): ?DateTime
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(?DateTime $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }
}
