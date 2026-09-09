<?php /** @noinspection PhpMultipleClassDeclarationsInspection */

namespace App\Entity;

use App\Service\Extra\UuidUtil;

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
use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\GET\User\User\ApiGetMyProfileController;
use App\Controller\Api\CRUD\GET\User\User\SocialNetworkController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostChangePasswordController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostChangePasswordSendOtpController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostConfirmAccountController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostConfirmAccountTokenlessController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostGrantRoleController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostMarkOfflineController;
use App\Controller\Api\CRUD\POST\User\User\ApiPostPingController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Controller\Api\Filter\User\RolesFilter;
use App\Dto\Image\ImageInput;
use App\Dto\User\AccountConfirmInput;
use App\Dto\User\AccountConfirmOutput;
use App\Dto\User\ChangePasswordInput;
use App\Dto\User\ChangePasswordSendOtpInput;
use App\Dto\User\RoleInput;
use App\Dto\User\SocialNetworkOutput;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Extra\OAuthProvider;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\Abstract\Address;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\TechSupport\TicketApproval;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\SingleImageTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User\Education;
use App\Entity\User\Occupation;
use App\Entity\User\Phone;
use App\Entity\User\SocialNetwork;
use App\Exception\AppMessageException;
use App\Repository\User\UserRepository;
use App\State\Localization\Geography\UserGeographyLocalizationProvider;
use DateTime;
use DateTimeImmutable;
use Deprecated;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

/**
 * БАГФИКС (26.08.2026, найден по продовому 500): POST /users с email,
 * который уже занят, раньше падал НЕОБРАБОТАННЫМ PDOException/
 * UniqueConstraintViolationException прямо из Doctrine ("duplicate key
 * value violates unique constraint uniq_identifier_email") — 500 Internal
 * Server Error вместо внятной ошибки, потому что до этого нигде не было
 * app-уровневой проверки уникальности: единственной защитой оставался
 * сам ORM\UniqueConstraint в БД (см. ниже), а он бьёт по insert уже
 * ПОСЛЕ прохождения валидации.
 *
 * Проверка уникальности email/login теперь — в UserListener::prePersist/
 * preUpdate() (AppMessageException → EMAIL_ALREADY_EXISTS/
 * LOGIN_ALREADY_EXISTS, {code, message} + 409), НЕ через #[UniqueEntity]:
 * тот отдавал ConstraintViolationList (422, нелокализованный английский
 * текст) — другой формат ошибки, чем весь остальной API. login — та же
 * природа бага (свой ORM\UniqueConstraint, тоже раньше был без
 * app-уровневой защиты).
 */
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
            controller: ApiGetMyProfileController::class,
            normalizationContext: ['groups' => G::OPS_USERS_ME],
        ),
        new Get(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            normalizationContext: [
                'groups' => G::OPS_USERS_PUBLIC,
                'skip_null_values' => false,
            ],
            provider: UserGeographyLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/users',
            normalizationContext: [
                'groups' => G::OPS_USERS_PUBLIC,
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
            controller: ApiPostGrantRoleController::class,
            input: RoleInput::class,
        ),
        new Post(
            uriTemplate: '/confirm-account/',
            controller: ApiPostConfirmAccountController::class,
            input: AccountConfirmInput::class,
            output: AccountConfirmOutput::class,
        ),
        new Post(
            uriTemplate: '/confirm-account-tokenless/',
            controller: ApiPostConfirmAccountTokenlessController::class,
            input: false,
            output: AccountConfirmOutput::class,
        ),
        new Post(
            uriTemplate: '/users/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPostUniversalImageController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            normalizationContext: [
                'groups' => G::OPS_USERS_ME,
                'skip_null_values' => false,
            ],
            denormalizationContext: ['groups' => [
                G::PHONES_WRITE,
                G::CLIENTS,
                G::MASTERS,
                G::USER_PUBLIC,
                // Только ради cookiesAgreed — единственное сейчас поле с
                // группой USERS_ME без writable: false (см. User::$cookiesAgreed).
                G::USERS_ME,
            ]],
            security:
                "is_granted('ROLE_ADMIN') or
                 ((is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')) and
                 object == user)",
        ),
        new Delete(
            uriTemplate: '/users/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            security:
                "is_granted('ROLE_ADMIN') or
                 ((is_granted('ROLE_MASTER') or
                 is_granted('ROLE_CLIENT')) and
                 object == user)",
        ),
        new Post(
            uriTemplate: '/users/ping',
            controller: ApiPostPingController::class,
            input: false,
            output: false,
            name: 'users_ping',
        ),
        new Post(
            uriTemplate: '/users/offline',
            controller: ApiPostMarkOfflineController::class,
            input: false,
            output: false,
            name: 'users_offline',
        ),
        new Post(
            uriTemplate: '/change-password/send-otp/',
            controller: ApiPostChangePasswordSendOtpController::class,
            input: ChangePasswordSendOtpInput::class,
            output: false,
            name: 'change_password_send_otp',
        ),
        new Post(
            uriTemplate: '/change-password/',
            controller: ApiPostChangePasswordController::class,
            input: ChangePasswordInput::class,
            output: false,
            name: 'change_password',
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

    # ROLE_SUPER_ADMIN всемогущ: наследует ROLE_ADMIN, поэтому любая проверка
    # is_granted('ROLE_ADMIN') (например security: в #[ApiResource] у User,
    # Gallery, Review, Appeal, BlackList, Favorite) автоматически пропускает
    # супер-админа — без дублирования 'ROLE_ADMIN'/'ROLE_SUPER_ADMIN' по всем
    # местам. Это касается только is_granted()/voter-проверок; "сырые" проверки
    # вида in_array('ROLE_ADMIN', $user->getRoles()) сюда не попадают — для них
    # роль дополняется на уровне User::getRoles().
    public const array ROLES = [
        'Суперадмин' => 'ROLE_SUPER_ADMIN',
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

        if($this->name && $this->surname) return "$this->name $this->surname, ({$this->getEmail()}), [$roles]";

        return $this->getEmail() ?: ('#' . UuidUtil::short($this->id));
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
        $this->ticketApprovals = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Uuid $id = null;

    /**
     * БАГФИКС (05.09.2026): раньше email был в группах MASTERS/CLIENTS/
     * CHATS/TICKETS/REVIEWS и т.д. — то есть светился в ЛЮБОМ месте, где
     * User встраивается в другую сущность целиком (автор/мастер тикета,
     * сторона чата, сторона отзыва, техподдержка...) — то есть публично,
     * кому угодно. Единственная группа теперь — USERS_ME: email виден
     * только самому владельцу на GET /users/me (эта операция включает
     * USERS_ME в normalizationContext — см. G::OPS_USERS_ME), и нигде
     * больше, включая даже публичный профиль GET /users/{id} (тот
     * использует MASTERS/CLIENTS/USER_PUBLIC — USERS_ME туда не входит).
     */
    #[ORM\Column(length: 180, unique: true, nullable: true)]
    #[Groups([
        G::USERS_ME,
    ])]
    private ?string $email = null;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?string $login = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::ADMINISTRANT_PUBLIC,
    ])]
    private ?string $name = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::ADMINISTRANT_PUBLIC,
    ])]
    private ?string $surname = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::USER_PUBLIC,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::ADMINISTRANT_PUBLIC,
    ])]
    private ?string $patronymic = null;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    #[Assert\LessThanOrEqual(value: 5, message: 'Field cannot be greater than 5')]
    private ?float $rating = null;

    #[ORM\Column(length: 16, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?string $gender = 'gender_neutral';

    /**
     * БАГФИКС (09.09.2026, тот же класс проблемы, что и с email — см. его
     * докблок выше): было в группах MASTERS/CLIENTS — то есть точная дата
     * рождения любого мастера/клиента светилась в ПУБЛИЧНОМ (без
     * авторизации) GET /users/{id} и GET /users (те используют
     * OPS_USERS_PUBLIC = MASTERS+CLIENTS+USER_PUBLIC). Единственная
     * группа теперь — USERS_ME: видна только самому владельцу на
     * GET /users/me. TECH_SUPPORT/TECH_SUPPORT_MESSAGES тоже убраны —
     * админу для обработки тикета ТП точная дата рождения обратившегося
     * не нужна, тот же довод, по которому email убрали оттуда же.
     */
    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups([
        G::USERS_ME,
    ])]
    private ?DateTime $dateOfBirth = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::ADMINISTRANT_PUBLIC,
    ])]
    #[ApiProperty(writable: false)]
    private ?string $imageExternalUrl = null;

    /**
     * @var Collection<int, Phone>
     */
    #[ORM\OneToMany(targetEntity: Phone::class, mappedBy: 'owner', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups([G::PHONES_READ, G::PHONES_WRITE, G::PHONE_WRITE])]
    private Collection $phones;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?bool $atHome = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[ApiProperty(writable: false)]
    private ?string $telegramChatId = null;

    #[ORM\Column(type: 'boolean', nullable: false)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private bool $active = false;

    #[ORM\Column(type: 'boolean', nullable: false)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private bool $approved = false;

    /**
     * Блокировка пользователя администратором. Переключается только из
     * EasyAdmin (writable: false — недостижимо через API ни при каких
     * условиях). Пока true — active/approved не могут стать true никаким
     * путём (см. setActive/setApproved/setBanned ниже), включая
     * самоактивацию через email/OTP (ApiPostConfirmAccountController,
     * ApiPostConfirmAccountTokenlessController) — тот же паттерн, что
     * у Ticket::banned. AccessService::check() дополнительно жёстко
     * блокирует доступ забаненному пользователю независимо от grade.
     */
    #[ORM\Column(type: 'boolean', nullable: false, options: ['default' => false])]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private bool $banned = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
        G::ADMINISTRANT_PUBLIC,
    ])]
    #[ApiProperty(writable: false)]
    private ?DateTimeImmutable $lastSeen = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
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
    #[ApiProperty(readable: false)]
    private ?string $password = null;

    /**
     * @var Collection<int, SocialNetwork>
     */
    #[ORM\OneToMany(targetEntity: SocialNetwork::class, mappedBy: 'user', cascade: ['all'])]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
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
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
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
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
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
    // Assert\Valid — та же причина, что у Ticket::$addresses (см. её
    // докблок): без неё Address::validateGeographyHierarchy() не
    // срабатывает, когда адрес приходит вложенным элементом коллекции
    // (UserCrudController::CollectionField 'addresses' →
    // useEntryCrudForm(AddressCrudController)), а не отдельным top-level
    // объектом валидации.
    #[Assert\Valid]
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::APPEAL_TICKET,

        G::FAVORITES,
        G::BLACK_LISTS,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private Collection $addresses;

    /**
     * Привязанные внешние аккаунты (google/facebook/instagram/telegram) —
     * см. OAuthProvider. writable: false — эта коллекция никогда не
     * пишется напрямую через API-запрос к User, только через выделенные
     * OAuth-эндпоинты (GeneralOAuth::callback / ProfileOAuth::link/
     * unlink). G::USERS_ME — видна только самому владельцу, не в
     * публичном профиле.
     */
    #[ORM\OneToMany(targetEntity: OAuthProvider::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    #[Groups([
        G::USERS_ME
    ])]
    #[ApiProperty(writable: false)]
    private Collection $oauthProviders;

    /**
     * Согласие на использование cookie. Только G::USERS_ME (не USER_PUBLIC/
     * MASTERS/CLIENTS) — приватный флаг самого пользователя, посторонним
     * видеть его в чужом профиле незачем. Пишется владельцем через
     * PATCH /users/{id} (см. denormalizationContext операции Patch выше —
     * G::USERS_ME добавлена туда же ради этого поля). Версионируется —
     * см. UserRevisionListener/EntityRevision.
     */
    #[ORM\Column(type: 'boolean', nullable: false, options: ['default' => false])]
    #[Groups([
        G::USERS_ME
    ])]
    private bool $cookiesAgreed = false;

    /**
     * @var Collection<int, TicketApproval>
     */
    #[ORM\OneToMany(targetEntity: TicketApproval::class, mappedBy: 'administrant')]
    private Collection $ticketApprovals;

    public function getId(): ?Uuid
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

    public function isCookiesAgreed(): bool
    {
        return $this->cookiesAgreed;
    }

    public function setCookiesAgreed(bool $cookiesAgreed): static
    {
        $this->cookiesAgreed = $cookiesAgreed;

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

        // ROLE_SUPER_ADMIN всемогущ и включает в себя ROLE_ADMIN. role_hierarchy
        // в security.yaml даёт это для is_granted()/voter-проверок, но много кода
        // в проекте проверяет роли "напрямую" (in_array/array_intersect по
        // getRoles() — AccessService, ApiGetTechSupportController,
        // ApiPatchTechSupportController, TechSupportListener и т.д.), а такие
        // проверки role_hierarchy не видят. Дополняем здесь — в одном месте,
        // а не в каждой отдельной проверке по коду.
        if (in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            $roles[] = 'ROLE_ADMIN';
        }

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
     * Серверная версия правила из userCrud.js (там — только UX-подсказка,
     * дизейблит чекбоксы в форме; здесь — реальный запрет, чтобы недопустимое
     * сочетание нельзя было сохранить в обход формы).
     *
     * Разрешено: [CLIENT] [MASTER] [ADMIN] [SUPER_ADMIN] [ADMIN, SUPER_ADMIN].
     * Запрещено: CLIENT+MASTER вместе, и любое смешивание personal-ролей
     * (CLIENT/MASTER) с admin-ролями (ADMIN/SUPER_ADMIN).
     */
    #[Assert\Callback]
    public function validateRoleCombination(ExecutionContextInterface $context): void
    {
        $personal = array_intersect($this->roles, ['ROLE_CLIENT', 'ROLE_MASTER']);
        $admin    = array_intersect($this->roles, ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);

        if (count($personal) > 1 || (count($personal) >= 1 && count($admin) >= 1)) {
            $context->buildViolation(
                'Недопустимое сочетание ролей. Разрешено: одна из CLIENT/MASTER, '
                . 'либо ADMIN и/или SUPER_ADMIN вместе — но не то и другое сразу.'
            )
                ->atPath('roles')
                ->addViolation();
        }
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
        // Пока пользователь забанен, активировать его в обход бана нельзя —
        // тот же принцип, что и у approved ниже (см. setApproved/setBanned).
        if ($this->banned && $active === true) {
            return $this;
        }

        $this->active = $active;
        return $this;
    }

    public function getApproved(): bool
    {
        return $this->approved;
    }

    public function setApproved(bool $approved): static
    {
        // Пока пользователь забанен, подтвердить его нельзя — в т.ч. через
        // самоактивацию по email/OTP.
        if ($this->banned && $approved === true) {
            return $this;
        }

        $this->approved = $approved;
        return $this;
    }

    public function getBanned(): bool
    {
        return $this->banned;
    }

    public function setBanned(bool $banned): static
    {
        $this->banned = $banned;

        // При включении бана сразу гасим active/approved — пользователь не
        // должен висеть в БД как "активный"/"подтверждённый", будучи
        // забаненным (тот же паттерн, что у Ticket::setBanned).
        if ($banned) {
            $this->active   = false;
            $this->approved = false;
        }

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
        G::MASTERS,
        G::CLIENTS,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::USER_PUBLIC,
    ])]
    #[ApiProperty(writable: false)]
    public function getIsOnline(): bool
    {
        if ($this->lastSeen === null) return false;
        return $this->lastSeen > new DateTimeImmutable('-2 minutes');
    }

    #[Groups([
        G::MASTERS,
        G::CLIENTS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::GALLERIES,
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::CHATS,
        G::CHAT_MESSAGES,
        G::APPEAL_TICKET,
        G::FAVORITES,
        G::BLACK_LISTS,
        G::TECH_SUPPORT,
        G::USER_PUBLIC,
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

    /** См. докблок $oauthProviders выше. */
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
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    /**
     * БАГФИКС (26.08.2026, найден при аудите на предмет необработанных
     * 500): проверка "не младше 18" раньше жила ПРЯМО в setDateOfBirth()
     * и кидала сырой InvalidArgumentException. Сеттеры вызываются Symfony
     * Serializer'ом (PropertyAccessor) во время денормализации тела
     * запроса — ДО того, как в дело вступает Symfony Validator, — так что
     * это исключение долетало необработанным до kernel-уровня и уходило
     * клиенту как голый 500 Internal Server Error (со стектрейсом в теле
     * ответа). Живьём проверено: POST /users с dateOfBirth младше 18 лет
     * реально падал 500.
     *
     * Вынесено сюда, в #[Assert\Callback] — тот же механизм, что уже
     * использует validateRoleCombination() выше — срабатывает уже В
     * ПРАВИЛЬНОЙ фазе (ValidateProvider, после денормализации). Кидает
     * AppMessageException, а не $context->buildViolation(): единый
     * {code, message} формат со всем остальным API, а не
     * ConstraintViolationList с нелокализованным английским текстом
     * (см. докблок AppMessageException — это тоже часть системного фикса
     * от 26.08.2026 на единый формат ошибок).
     */
    #[Assert\Callback]
    public function validateDateOfBirth(ExecutionContextInterface $context): void
    {
        if ($this->dateOfBirth === null) return;

        $age = (new DateTime())->diff($this->dateOfBirth)->y;

        if ($age < 18) {
            throw new AppMessageException(AppMessages::USER_UNDERAGE);
        }
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

    /**
     * @return Collection<int, TicketApproval>
     */
    public function getTicketApprovals(): Collection
    {
        return $this->ticketApprovals;
    }

    public function addTicketApproval(TicketApproval $ticketApproval): static
    {
        if (!$this->ticketApprovals->contains($ticketApproval)) {
            $this->ticketApprovals->add($ticketApproval);
            $ticketApproval->setAdministrant($this);
        }

        return $this;
    }

    public function removeTicketApproval(TicketApproval $ticketApproval): static
    {
        if ($this->ticketApprovals->removeElement($ticketApproval)) {
            // set the owning side to null (unless already changed)
            if ($ticketApproval->getAdministrant() === $this) {
                $ticketApproval->setAdministrant(null);
            }
        }

        return $this;
    }
}
