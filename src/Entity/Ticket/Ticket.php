<?php

namespace App\Entity\Ticket;

use App\Service\Extra\UuidUtil;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\Ticket\Ticket\ApiGetMyTicketsController;
use App\Controller\Api\CRUD\PATCH\Ticket\Ticket\ApiPatchTicketController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\Ticket\Ticket\ApiPostTicketController;
use App\Controller\Api\Filter\Address\AddressFilter;
use App\Dto\Image\ImageInput;
use App\Dto\Ticket\TicketInput;
use App\Dto\Ticket\TicketPatchInput;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Entity\Contract\HasImagesInterface;
use App\Entity\Extra\MultipleImage;
use App\Entity\Geography\Abstract\Address;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TicketApproval;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Entity\User\Occupation;
use App\Repository\Ticket\TicketRepository;
use App\State\Localization\Geography\TicketGeographyLocalizationProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TicketRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/tickets/me',
            controller: ApiGetMyTicketsController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL],
        ),
        new Get(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL, 'skip_null_values' => false],
            provider: TicketGeographyLocalizationProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/tickets',
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL, 'skip_null_values' => false],
            provider: TicketGeographyLocalizationProvider::class,
        ),
        new Post(
            uriTemplate: '/tickets',
            controller: ApiPostTicketController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS],
            input: TicketInput::class,
        ),
        new Post(
            uriTemplate: '/tickets/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPostUniversalImageController::class,
            input: ImageInput::class,
        ),
        new Patch(
            uriTemplate: '/tickets/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPatchTicketController::class,
            normalizationContext: ['groups' => G::OPS_TICKETS_FULL],
            input: TicketPatchInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(BooleanFilter::class, properties: ['active', 'service', 'negotiableBudget'])]
#[ApiFilter(ExistsFilter::class, properties: ['master', 'author'])]
#[ApiFilter(SearchFilter::class, properties: ['category', 'subcategory', 'master', 'author', 'description' => 'partial'])]
#[ApiFilter(AddressFilter::class)]
#[ApiFilter(RangeFilter::class, properties: ['budget', 'master.rating', 'author.rating', 'reviewsCount'])]
class Ticket implements HasImagesInterface
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, DescriptionTrait, PriorityTrait;

    public function __toString(): string
    {
        $label = $this->title ?? 'Ticket';
        $counterpart = $this->author ?? $this->master;

        if (!$counterpart) return $label;

        $roles = array_values(array_diff($counterpart->getRoles(), ['ROLE_USER']));
        $role = $roles[0] ?? 'ROLE_USER';

        $fullName = trim(($counterpart->getName() ?? '') . ' ' . ($counterpart->getSurname() ?? ''));

        return "$label - $fullName, ({$counterpart->getEmail()}), [$role]";
    }

    public function __construct()
    {
        $this->reviews = new ArrayCollection();
        $this->appeals = new ArrayCollection();
        $this->chats = new ArrayCollection();
        $this->addresses = new ArrayCollection();
        $this->images = new ArrayCollection();
        $this->ticketApprovals = new ArrayCollection();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?string $notice = null;

    #[ORM\Column(nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    #[Assert\PositiveOrZero(message: 'Field cannot be less than zero')]
    private ?float $budget = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $negotiableBudget = false;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $service = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?bool $active = null;

    /**
     * Признак одобрения тикета администратором.
     * По умолчанию false — не виден в публичных коллекциях до одобрения.
     * Исключение: GET /tickets/me возвращает собственные тикеты независимо от этого поля.
     */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
    ])]
    #[ApiProperty(writable: false)]
    private bool $approved = false;

    /**
     * БАГФИКС (11.09.2026, по жалобе "отзывы пропадают после правки
     * объявления"): "хоть раз одобрен админом" — В ОТЛИЧИЕ от $approved
     * НИКОГДА не сбрасывается правкой контента (TicketListener::postUpdate()/
     * onFlush() гасят обратно в false именно $approved, а не это поле — тикет
     * с уже одобренным контентом требует повторной модерации КАЖДОЙ правки,
     * но это не значит, что его прошлое одобрение аннулируется).
     *
     * Раньше видимость Review (ReviewVisibilityExtension/
     * ReviewLocalizationProvider) была завязана на живой $approved — из-за
     * этого банальная правка опечатки в title/description (см.
     * TicketListener::NOTIFIABLE_FIELDS) сбрасывала $approved в false до
     * повторной проверки админом, и ВСЕ уже опубликованные отзывы на этот
     * тикет на всё это время пропадали из публичного профиля мастера —
     * хотя отзыв про уже выполненную работу, а не про текущую редакцию
     * текста объявления. Теперь видимость отзывов проверяется по
     * $everApproved — единожды одобренный тикет её не теряет из-за
     * последующих правок, отзывы остаются на месте, пока админ решает
     * судьбу новой редакции. Сама коллекция /tickets по-прежнему фильтруется
     * по живому $approved (ApprovedTicketExtension) — до одобрения новой
     * редакции публично показывать её как проверенную по-прежнему нельзя,
     * это осознанно не меняется, меняется только видимость отзывов.
     *
     * Проставляется единственно в setApproved() (единая точка записи —
     * её же вызывает каскад из TicketApproval::setApproved(true), см. её
     * докблок) и сбрасывается обратно в setBanned(true): бан — это реальное
     * модераторское решение "с тикетом что-то не так" (а не рутинная правка
     * контента), отзывы на забаненный тикет по-прежнему должны прятаться.
     *
     * writable: false — не должно быть доступно на запись даже теоретически,
     * выставляется только изнутри setApproved()/setBanned().
     */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
    ])]
    #[ApiProperty(writable: false)]
    private bool $everApproved = false;

    /**
     * Блокировка тикета администратором. Переключается только из EasyAdmin
     * (writable: false — недостижимо через PATCH DTO ни при каких условиях).
     * Пока true — автор/мастер не может изменить ни одно поле тикета
     * (см. ApiPatchTicketController) и не может загружать фото
     * (см. ApiPostUniversalImageController::performAdditionalChecks) —
     * тот же паттерн блокировки, что у TechSupport::STATUS_BANNED.
     */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
    ])]
    #[ApiProperty(writable: false)]
    private bool $banned = false;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private int $viewsCount = 0;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private int $responsesCount = 0;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Category $category = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'subcategory_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Occupation $subcategory = null;

    #[ORM\ManyToOne(inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'tickets')]
    #[ORM\JoinColumn(name: 'master_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?User $master = null;

    #[ORM\ManyToOne(cascade: ['all'], inversedBy: 'userTickets')]
    #[ORM\JoinColumn(name: 'unit_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private ?Unit $unit = null;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private int $reviewsCount = 0;

    /**
     * @var Collection<int, Review>
     */
    #[ORM\OneToMany(targetEntity: Review::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $reviews;

    /**
     * @var Collection<int, Appeal>
     */
    #[ORM\OneToMany(targetEntity: Appeal::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $appeals;

    /**
     * @var Collection<int, Chat>
     */
    #[ORM\OneToMany(targetEntity: Chat::class, mappedBy: 'ticket')]
    #[Ignore]
    private Collection $chats;

    /**
     * @var Collection<int, Address>
     */
    #[ORM\ManyToMany(targetEntity: Address::class, inversedBy: 'tickets', cascade: ['all'])]
    // Assert\Valid — без неё Symfony Validator не спускается внутрь
    // коллекции при валидации самого Ticket: Address::
    // validateGeographyHierarchy() (проверка "город принадлежит
    // выбранному региону" и т.п.) иначе просто никогда не вызывается,
    // если Address приходит НЕ как отдельный top-level объект валидации
    // (как на прямой странице /address/new), а как элемент ВЛОЖЕННОЙ
    // коллекции — ровно так это происходит в EasyAdmin (TicketCrudController::
    // CollectionField 'addresses' → useEntryCrudForm(AddressCrudController)
    // рендерит адрес прямо ВНУТРИ формы Ticket, единым сабмитом, без
    // отдельного захода на страницу Address). Без этой аннотации там можно
    // было сохранить "Согдийская область" + город "Вахдат" (реально из
    // другой области) — сам Address создавался бы валидным по своим
    // собственным правилам, просто validate($ticket) их не проверял.
    #[Assert\Valid]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::REVIEWS_CLIENT,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private Collection $addresses;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'ticket', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,
        G::REVIEWS,
        G::FAVORITES,
        G::APPEAL_TICKET,
        G::APPEAL_CHAT,
        G::BLACK_LISTS,
        G::CHATS,
    ])]
    private Collection $images;

    /**
     * @var Collection<int, TicketApproval>
     */
    #[ORM\OneToMany(targetEntity: TicketApproval::class, mappedBy: 'ticket')]
    private Collection $ticketApprovals;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    /**
     * Декоративный slug для красивых ссылок (06.09.2026, переход на
     * UUID-PK — см. обсуждение "UUID + латинизация title" в чате). НЕ
     * персистится, ничего не идентифицирует сам по себе — реальный lookup
     * тикета всегда идёт по UUID (см. GetCollection/Get выше). Фронт
     * собирает ссылку вида /tickets/{id}?slug={slug} — бэкенд слаг из
     * query читает, но игнорирует при разрешении сущности (это только
     * читаемость в адресной строке/шаринге, не идентификатор). Живая
     * проекция $title — меняется вместе с ним при правке, никакой
     * рассинхронизации/уникальности/регенерации не требуется в принципе,
     * в отличие от классического персистентного слага.
     */
    #[Groups([G::MASTER_TICKETS, G::CLIENT_TICKETS])]
    public function getSlug(): string
    {
        static $translitMap = [
            'а'=>'a','б'=>'b','в'=>'v','г'=>'g','ғ'=>'gh','д'=>'d','е'=>'e','ё'=>'yo',
            'ж'=>'zh','з'=>'z','и'=>'i','ӣ'=>'i','й'=>'y','к'=>'k','қ'=>'q','л'=>'l',
            'м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u',
            'ӯ'=>'u','ф'=>'f','х'=>'kh','ҳ'=>'h','ц'=>'ts','ч'=>'ch','ҷ'=>'j','ш'=>'sh',
            'щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya',
        ];

        $lower = mb_strtolower($this->title ?? '');
        $latin = strtr($lower, $translitMap);
        $slug  = preg_replace('/[^a-z0-9]+/u', '-', $latin);

        return trim($slug ?? '', '-') ?: 'ticket';
    }

    public function getViewsCount(): int
    {
        return $this->viewsCount;
    }

    public function setViewsCount(int $viewsCount): static
    {
        $this->viewsCount = $viewsCount;

        return $this;
    }

    public function getResponsesCount(): int
    {
        return $this->responsesCount;
    }

    public function setResponsesCount(int $responsesCount): static
    {
        $this->responsesCount = $responsesCount;

        return $this;
    }

    public function incrementResponsesCount(): static
    {
        $this->responsesCount++;

        return $this;
    }

    public function incrementViewsCount(): static
    {
        $this->viewsCount++;
        return $this;
    }

    public function getNotice(): ?string
    {
        return strip_tags($this->notice);
    }

    public function setNotice(?string $notice): Ticket
    {
        $this->notice = $notice;
        return $this;
    }

    public function getBudget(): ?float
    {
        return $this->budget;
    }

    public function setBudget(?float $budget): static
    {
        $this->budget = $budget;

        return $this;
    }

    public function getNegotiableBudget(): ?bool
    {
        return $this->negotiableBudget;
    }

    public function setNegotiableBudget(?bool $negotiableBudget): static
    {
        $this->negotiableBudget = $negotiableBudget;
        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

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

    public function getActive(): ?bool
    {
        return $this->active;
    }

    public function setActive(?bool $active): Ticket
    {
        // Пока тикет забанен, реактивировать его в обход бана нельзя —
        // тот же принцип, что и у approved ниже (см. setApproved/setBanned).
        if ($this->banned && $active === true) {
            return $this;
        }

        $this->active = $active;
        return $this;
    }

    public function getUnit(): ?Unit
    {
        return $this->unit;
    }

    public function setUnit(?Unit $unit): static
    {
        $this->unit = $unit;

        return $this;
    }

    /**
     * @return Collection<int, Review>
     */
    public function getReviews(): Collection
    {
        return $this->reviews;
    }

    public function addReview(Review $review): static
    {
        if (!$this->reviews->contains($review)) {
            $this->reviews->add($review);
            $review->setTicket($this);
        }

        return $this;
    }

    public function removeReview(Review $review): static
    {
        if ($this->reviews->removeElement($review)) {
            // set the owning side to null (unless already changed)
            if ($review->getTicket() === $this) {
                $review->setTicket(null);
            }
        }

        return $this;
    }

    public function getMaster(): ?User
    {
        return $this->master;
    }

    public function setMaster(?User $master): static
    {
        $this->master = $master;

        return $this;
    }

    public function getService(): ?bool
    {
        return $this->service;
    }

    public function setService(?bool $service): Ticket
    {
        $this->service = $service;
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
            $appeal->setTicket($this);
        }

        return $this;
    }

    public function removeAppeal(Appeal $appeal): static
    {
        if ($this->appeals->removeElement($appeal)) {
            if ($appeal->getTicket() === $this) {
                $appeal->setTicket(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getChats(): Collection
    {
        return $this->chats;
    }

    public function addChat(Chat $chat): static
    {
        if (!$this->chats->contains($chat)) {
            $this->chats->add($chat);
            $chat->setTicket($this);
        }

        return $this;
    }

    public function removeChat(Chat $chat): static
    {
        if ($this->chats->removeElement($chat)) {
            // set the owning side to null (unless already changed)
            if ($chat->getTicket() === $this) {
                $chat->setTicket(null);
            }
        }

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
        }

        return $this;
    }

    public function removeAddress(Address $address): static
    {
        $this->addresses->removeElement($address);

        return $this;
    }


    public function getSubcategory(): ?Occupation
    {
        return $this->subcategory;
    }

    public function setSubcategory(?Occupation $subcategory): static
    {
        $this->subcategory = $subcategory;

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
            $image->setTicket($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getTicket() === $this) {
                $image->setTicket(null);
            }
        }

        return $this;
    }

    public function getReviewsCount(): int
    {
        return $this->reviewsCount;
    }

    public function setReviewsCount(int $reviewsCount): static
    {
        $this->reviewsCount = $reviewsCount;
        return $this;
    }

    public function incrementReviewsCount(): static
    {
        $this->reviewsCount++;
        return $this;
    }

    public function decrementReviewsCount(): static
    {
        if ($this->reviewsCount > 0) $this->reviewsCount--;
        return $this;
    }

    public function getApproved(): bool
    {
        return $this->approved;
    }

    public function setApproved(bool $approved): static
    {
        // Пока тикет забанен, одобрить его нельзя — в т.ч. через каскад
        // из TicketApproval::setApproved(true), который вызывает этот же
        // сеттер. Один choke-point на оба пути записи.
        if ($this->banned && $approved === true) {
            return $this;
        }

        $this->approved = $approved;

        // $everApproved — только "включаем", никогда не гасим здесь при
        // $approved === false (правка контента сбрасывает именно $approved,
        // см. TicketListener — это не должно аннулировать факт прошлого
        // одобрения). См. докблок поля $everApproved — единственное место,
        // где оно гасится обратно, это setBanned(true) ниже.
        if ($approved) {
            $this->everApproved = true;
        }

        return $this;
    }

    public function getEverApproved(): bool
    {
        return $this->everApproved;
    }

    public function getBanned(): bool
    {
        return $this->banned;
    }

    public function setBanned(bool $banned): static
    {
        $this->banned = $banned;

        // При включении бана сразу гасим active/approved — тикет не должен
        // висеть в БД как "активный"/"одобрённый", будучи забаненным
        // (и, как следствие, пропадает из публичных /tickets — approved=false
        // уже гейтит видимость на уровне TicketRepository). $everApproved
        // тоже гасим — бан отменяет прошлое одобрение по сути (реальное
        // модераторское решение "с тикетом что-то не так"), а не только
        // текущую редакцию: отзывы на забаненный тикет должны прятаться
        // так же, как и сам тикет (см. докблок $everApproved).
        if ($banned) {
            $this->active       = false;
            $this->approved     = false;
            $this->everApproved = false;
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
            $ticketApproval->setTicket($this);
        }

        return $this;
    }

    public function removeTicketApproval(TicketApproval $ticketApproval): static
    {
        if ($this->ticketApprovals->removeElement($ticketApproval)) {
            // set the owning side to null (unless already changed)
            if ($ticketApproval->getTicket() === $this) {
                $ticketApproval->setTicket(null);
            }
        }

        return $this;
    }
}
