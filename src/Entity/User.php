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
use App\Controller\Api\CRUD\GET\User\PersonalUserFilterController;
use App\Controller\Api\CRUD\GET\User\SocialNetworkController;
use App\Controller\Api\CRUD\POST\Image\UniversalImageUploadController;
use App\Controller\Api\CRUD\POST\User\User\ConfirmAccountController;
use App\Controller\Api\CRUD\POST\User\User\ConfirmAccountTokenlessController;
use App\Controller\Api\CRUD\POST\User\User\GrantRoleController;
use App\Controller\Api\CRUD\POST\User\User\MarkOfflineController;
use App\Controller\Api\CRUD\POST\User\User\PingController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Controller\Api\Filter\User\RolesFilter;
use App\Dto\Image\ImageInput;
use App\Dto\User\AccountConfirmInput;
use App\Dto\User\AccountConfirmOutput;
use App\Dto\User\RoleOutput;
use App\Dto\User\SocialNetworkOutput;
use App\Entity\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Extra\OAuthProvider;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\Abstract\Address;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\DescriptionTrait;
use App\Entity\Trait\SingleImageTrait;
use App\Entity\Trait\UpdatedAtTrait;
use App\Entity\User\Education;
use App\Entity\User\Occupation;
use App\Entity\User\Phone;
use App\Entity\User\SocialNetwork;
use App\Repository\User\UserRepository;
use App\State\Localization\Geography\UserGeographyLocalizationProvider;
use DateTime;
use DateTimeImmutable;
use Deprecated;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use InvalidArgumentException;
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
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_LOGIN', fields: ['login'])]
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
                'groups' => ['clients:read', 'masters:read', 'user:public:read'],
                'skip_null_values' => false,
            ],
            provider: UserGeographyLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/users',
            normalizationContext: [
                'groups' => ['clients:read', 'masters:read', 'user:public:read'],
                'skip_null_values' => false,
            ],
            provider: UserGeographyLocalizationProvider::class,
        ),
        new Post(
            uriTemplate: '/users',
            validationContext: ['groups' => ['Default', 'registration']],
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
            uriTemplate: '/users/{id}/update-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '\d+'],
            controller: UniversalImageUploadController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '\d+'],
            denormalizationContext: ['groups' => [
                'users:phones:write',
                'clients:read',
                'masters:read',
                'user:public:read'
            ]],
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
        ),
        new Post(
            uriTemplate: '/users/ping',
            controller: PingController::class,
            input: false,
            output: false,
            name: 'users_ping',
        ),
        new Post(
            uriTemplate: '/users/offline',
            controller: MarkOfflineController::class,
            input: false,
            output: false,
            name: 'users_offline',
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(BooleanFilter::class, properties: ['active', 'atHome'])]
#[ApiFilter(RangeFilter::class, properties: ['rating'])]
#[ApiFilter(SearchFilter::class, properties: ['occupation', 'gender', 'socialNetworks'])]
#[ApiFilter(AddressFilter::class)]
#[ApiFilter(RolesFilter::class)]
#[ApiFilter(ExistsFilter::class, properties: ['image'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    use UpdatedAtTrait, CreatedAtTrait, SingleImageTrait, DescriptionTrait;

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
        $roles = implode(',', $this->roles);

        if($this->name && $this->surname) return "ID #$this->id, $this->name $this->surname, ({$this->getEmail()}), [$roles]";

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
        $this->imageAuthors = new ArrayCollection();
        $this->masterReviews = new ArrayCollection();
        $this->clientReviews = new ArrayCollection();
        $this->occupation = new ArrayCollection();
        $this->techSupportMessages = new ArrayCollection();
        $this->techSupports = new ArrayCollection();
        $this->techSupportsAsAuthor = new ArrayCollection();
        $this->appeals = new ArrayCollection();
        $this->appealsAsRespondent = new ArrayCollection();
        $this->addresses = new ArrayCollection();
        $this->oauthProviders = new ArrayCollection();
        $this->phones = new ArrayCollection();
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
        'blackLists:read',

        'user:public:read',
    ])]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true, nullable: true)]
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
        'blackLists:read',

//        'user:public:read',
    ])]
    private ?string $email = null;

    #[ORM\Column(length: 64, nullable: true)]
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
        'blackLists:read',

        'user:public:read',
    ])]
    private ?string $login = null;

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
        'blackLists:read',

        'user:public:read',
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
        'blackLists:read',

        'user:public:read',
    ])]
    private ?string $surname = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read'
    ])]
    private ?string $patronymic = null;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'masterTickets:read',
        'clientTickets:read',
        'favorites:read',

        'user:public:read'
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    #[Assert\LessThanOrEqual(value: 5, message: 'Field cannot be greater than 5')]
    private ?float $rating = null;

    #[ORM\Column(length: 16, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'blackLists:read',
        'favorites:read',

        'user:public:read',
    ])]
    private ?string $gender = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',

//        'user:public:read',
    ])]
    private ?DateTime $dateOfBirth = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
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
        'blackLists:read',

        'user:public:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?string $imageExternalUrl = null;

    /**
     * @var Collection<int, Phone>
     */
    #[ORM\OneToMany(targetEntity: Phone::class, mappedBy: 'owner', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'users:me:read',
        'users:phones:write',
    ])]
    private Collection $phones;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',

//        'user:public:read',
    ])]
    private ?bool $atHome = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[ApiProperty(writable: false)]
    private ?string $telegramChatId = null;

    #[ORM\Column(type: 'boolean', nullable: false)]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read'
    ])]
    #[ApiProperty(writable: false)]
    private bool $active = false;

    #[ORM\Column(type: 'boolean', nullable: false)]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read'
    ])]
    #[ApiProperty(writable: false)]
    private bool $approved = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups([
        'masters:read',
        'clients:read',
        'chats:read',
        'chatMessages:read',
        'user:public:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?DateTimeImmutable $lastSeen = null;

    /**
     * @var list<string> The user roles
     */
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
        'blackLists:read',

        'user:public:read',
    ])]
    #[ApiProperty(writable: false)]
    private array $roles = [];

    /**
     * @var string|null The hashed password
     */
    #[ORM\Column(nullable: true)]
    #[Assert\Length(
        min: 8,
        minMessage: "Password must be at least {{ limit }} characters long",
        groups: ['registration', 'password_change']
    )]
    #[Assert\Regex(
        pattern: "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).+$/",
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)",
        groups: ['registration', 'password_change']
    )]
    private ?string $password = null;

    /**
     * @var Collection<int, SocialNetwork>
     */
    #[ORM\OneToMany(targetEntity: SocialNetwork::class, mappedBy: 'user', cascade: ['all'])]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read',
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
        'masterTickets:read',

//        'user:public:read',
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
    #[ORM\OneToMany(targetEntity: Gallery::class, mappedBy: 'user', cascade: ['all'])]
    #[Ignore]
    private Collection $galleries;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\OneToMany(targetEntity: Ticket::class, mappedBy: 'master')]
    #[Ignore]
    private Collection $tickets;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'author', cascade: ['all'])]
    #[Ignore]
    private Collection $imageAuthors;

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
        'favorites:read',

        'user:public:read',
    ])]
    private Collection $occupation;

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
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'author')]
    #[Ignore]
    private Collection $appeals;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'respondent')]
    #[Ignore]
    private Collection $appealsAsRespondent;

    /**
     * @var Collection<int, Address>
     */
    #[ORM\ManyToMany(targetEntity: Address::class, mappedBy: 'users', cascade: ['persist'])]
    #[Groups([
        'masters:read',
        'clients:read',

        'user:public:read',
    ])]
    private Collection $addresses;

    #[ORM\OneToMany(targetEntity: OAuthProvider::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    #[Groups([
        'users:me:read'
    ])]
    #[ApiProperty(writable: false)]
    private Collection $oauthProviders;

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

    public function getLogin(): ?string
    {
        return $this->login;
    }

    public function setLogin(?string $login): static
    {
        $this->login = $login;

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

    public function getImageExternalUrl(): ?string
    {
        return $this->imageExternalUrl;
    }

    public function setImageExternalUrl(?string $imageExternalUrl): static
    {
        $this->imageExternalUrl = $imageExternalUrl;

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
     * @return Collection<int, MultipleImage>
     */
    public function getImageAuthors(): Collection
    {
        return $this->imageAuthors;
    }

    public function addImageAuthor(MultipleImage $imageAuthor): static
    {
        if (!$this->imageAuthors->contains($imageAuthor)) {
            $this->imageAuthors->add($imageAuthor);
            $imageAuthor->setAuthor($this);
        }

        return $this;
    }

    public function removeImageAuthor(MultipleImage $imageAuthor): static
    {
        if ($this->imageAuthors->removeElement($imageAuthor)) {
            // set the owning side to null (unless already changed)
            if ($imageAuthor->getAuthor() === $this) {
                $imageAuthor->setAuthor(null);
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
            if ($appeal->getAuthor() === $this) {
                $appeal->setAuthor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Appeal>
     */
    public function getAppealsAsRespondent(): Collection
    {
        return $this->appealsAsRespondent;
    }

    public function addAppealAsRespondent(Appeal $appeal): static
    {
        if (!$this->appealsAsRespondent->contains($appeal)) {
            $this->appealsAsRespondent->add($appeal);
            $appeal->setRespondent($this);
        }

        return $this;
    }

    public function removeAppealAsRespondent(Appeal $appeal): static
    {
        if ($this->appealsAsRespondent->removeElement($appeal)) {
            if ($appeal->getRespondent() === $this) {
                $appeal->setRespondent(null);
            }
        }

        return $this;
    }

    public function getActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): static
    {
        $this->active = $active;
        return $this;
    }

    public function getApproved(): bool
    {
        return $this->approved;
    }

    public function setApproved(bool $approved): static
    {
        $this->approved = $approved;
        return $this;
    }

    public function getLastSeen(): ?DateTimeImmutable
    {
        return $this->lastSeen;
    }

    public function setLastSeen(?DateTimeImmutable $lastSeen): static
    {
        $this->lastSeen = $lastSeen;
        return $this;
    }

    #[Groups([
        'masters:read',
        'clients:read',
        'chats:read',
        'chatMessages:read',
        'user:public:read',
    ])]
    #[ApiProperty(writable: false)]
    public function getIsOnline(): bool
    {
        if ($this->lastSeen === null) return false;
        return $this->lastSeen > new DateTimeImmutable('-2 minutes');
    }

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
        'blackLists:read',
        'favorites:read',

        'user:public:read',
    ])]
    #[ApiProperty(writable: false)]
    public function getReviewsCount(): int
    {
        return $this->masterReviews->count();
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

    public function getOauthProviders(): Collection
    {
        return $this->oauthProviders;
    }

    public function addOauthProvider(OAuthProvider $oauthProvider): static
    {
        if (!$this->oauthProviders->contains($oauthProvider)) {
            $this->oauthProviders->add($oauthProvider);
            $oauthProvider->setUser($this);
        }
        return $this;
    }

    public function removeOauthProvider(OAuthProvider $oauthProvider): static
    {
        $this->oauthProviders->removeElement($oauthProvider);
        return $this;
    }

    public function getDateOfBirth(): ?DateTime
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(?DateTime $dateOfBirth): static
    {
        if ($dateOfBirth !== null) {
            $age = (new DateTime())->diff($dateOfBirth)->y;

            if ($age < 18) {
                throw new InvalidArgumentException('User must be at least 18 years old');
            }
        }

        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    /**
     * @return Collection<int, Phone>
     */
    public function getPhones(): Collection
    {
        return $this->phones;
    }

    public function addPhone(Phone $phone): static
    {
        if (!$this->phones->contains($phone)) {
            $this->phones->add($phone);
            $phone->setOwner($this);
        }

        return $this;
    }

    public function removePhone(Phone $phone): static
    {
        if ($this->phones->removeElement($phone)) {
            // set the owning side to null (unless already changed)
            if ($phone->getOwner() === $this) {
                $phone->setOwner(null);
            }
        }

        return $this;
    }
}
