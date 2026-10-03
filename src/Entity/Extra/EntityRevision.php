<?php

namespace App\Entity\Extra;

use App\Service\Extra\UuidUtil;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\SnapshotSummaryTrait;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Неизменяемый след правки/удаления версионируемой сущности — снапшот
 * предыдущего состояния изменённых полей (action=updated) или удалённых
 * данных (action=deleted), плюс кто и когда это сделал.
 *
 * Один тип на ВСЕ версионируемые сущности (Ticket и далее по мере
 * расширения — ChatMessage/TechSupportMessage/Review/MultipleImage),
 * вместо отдельной Revision-сущности под каждую: entityType/entityId —
 * дискриминатор, snapshot — произвольный JSON, форма которого зависит от
 * того, что версионирует конкретный листенер. См. TicketListener — первый
 * (и пока единственный) писатель.
 *
 * Физически неизменяема: у ApiResource нет Post/Patch/Delete — только
 * чтение, и то исключительно ROLE_ADMIN.
 *
 * Retention: по умолчанию 14 дней (см. $expiresAt) — реально удаляются
 * командой app:prune-entity-revisions (не автоматически, БД сама ничего
 * не чистит). Конкретный писатель может передать null явно, чтобы
 * отключить retention для одной записи — она тогда хранится бессрочно.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/entity-revisions',
            security: "is_granted('ROLE_ADMIN')",
            normalizationContext: ['groups' => [G::ENTITY_REVISIONS]],
        ),
        new Get(
            uriTemplate: '/entity-revisions/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            security: "is_granted('ROLE_ADMIN')",
            normalizationContext: ['groups' => [G::ENTITY_REVISIONS]],
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(SearchFilter::class, properties: ['entityType' => 'exact', 'entityId' => 'exact', 'parentId' => 'exact', 'entity' => 'exact', 'action' => 'exact'])]
class EntityRevision
{
    use CreatedAtTrait, SnapshotSummaryTrait;

    public const string ACTION_UPDATED = 'updated';
    public const string ACTION_DELETED = 'deleted';

    /** Человекочитаемые подписи для админки (EntityRevisionCrudController). */
    public const array ACTIONS = [
        'Изменено' => self::ACTION_UPDATED,
        'Удалено'  => self::ACTION_DELETED,
    ];

    /**
     * Человекочитаемые подписи entityType для админки. Держим здесь же, где
     * и сами дискриминаторы пишутся листенерами (TicketListener,
     * ChatMessageListener, TechSupportMessageListener, ReviewListener,
     * AbstractApiHelperController::logImagesDeletion) — при добавлении
     * версионирования новой сущности новую строку нужно добавить и сюда.
     */
    public const array ENTITY_TYPES = [
        'Объявление / услуга'    => 'ticket',
        'Сообщение чата'         => 'chat_message',
        'Сообщение техподдержки' => 'tech_support_message',
        'Отзыв'                  => 'review',
        'Фото'                   => 'multiple_image',
        'Пользователь'           => 'user',
    ];

    /**
     * Таблица переводов для $entity — класса сущности, которой владеет
     * $parentId (или, если родителя нет — entityType=ticket, — самого себя).
     * В отличие от ENTITY_TYPES (тип ЭТОЙ записи ревизии: ticket/review/…),
     * $entity — это "куда она относится" на уровень выше: например, у
     * review $entity='Ticket', потому что и review, и его parentId
     * указывают на Ticket; у multiple_image $entity — класс той сущности,
     * которой принадлежало фото (Ticket/Review/ChatMessage/… — то же самое,
     * что раньше лежало в $snapshot['parentType'], теперь отдельной
     * фильтруемой колонкой). Ключ — короткое имя класса (см. setEntity() в
     * каждом писателе), значение — перевод для админки.
     */
    public const array ENTITIES = [
        'Ticket'              => 'Объявления/услуги',
        'Chat'                => 'Чат',
        'ChatMessage'         => 'Сообщение чата',
        'TechSupport'         => 'Техподдержка',
        'TechSupportMessage'  => 'Сообщение техподдержки',
        'Review'              => 'Отзыв',
        'Gallery'             => 'Галерея',
        'Appeal'              => 'Жалоба',
        'User'                => 'Пользователь',
    ];

    /**
     * Переводы имён полей внутри $snapshot для getSnapshotSummary() (см.
     * SnapshotSummaryTrait) — "description: было → стало" превращается в
     * "Описание: было → стало". Один общий список на все entityType, потому
     * что имена полей пересекаются (description есть у ticket/chat_message/
     * tech_support_message/review) — таскать перевод за каждым писателем
     * отдельно смысла нет. Поле, которого здесь нет, просто печатается как
     * есть (см. getSnapshotSummary) — новый versioned-писатель ничего не
     * сломает, если забыть сюда что-то добавить, просто будет непереведённая
     * строка вместо ошибки.
     *
     * public — переиспользуется TicketApproval (см. её getFieldLabels()):
     * снимок там — те же самые поля Ticket + 'address', один и тот же
     * перевод не дублируем.
     */
    public const array FIELD_LABELS = [
        'title'            => 'Заголовок',
        'description'      => 'Описание',
        'notice'           => 'Доп. описание',
        'budget'           => 'Бюджет',
        'negotiableBudget' => 'Договорная цена',
        'service'          => 'Тип (услуга/объявление)',
        'active'           => 'Активность',
        'priority'         => 'Приоритет',
        'category'         => 'Категория',
        'subcategory'      => 'Подкатегория',
        'unit'             => 'Единицы',
        'rating'           => 'Рейтинг',
        'cookiesAgreed'    => 'Согласие на cookie',
        'address'          => 'Адрес',
    ];

    /** По умолчанию хранится 14 дней — см. $expiresAt и app:prune-entity-revisions. */
    private const string DEFAULT_RETENTION = '+14 days';

    /**
     * По умолчанию — createdAt + 14 дней, проставляется прямо тут, в момент
     * создания объекта (не в PrePersist — иначе нельзя было бы отличить
     * "ещё не решили" от "явно поставили null"). Писатель (листенер) может
     * позвать setExpiresAt(null) ПОСЛЕ создания, чтобы отключить retention
     * для конкретной записи — она тогда хранится бессрочно.
     */
    public function __construct()
    {
        $this->expiresAt = new DateTimeImmutable(self::DEFAULT_RETENTION);
    }

    public function __toString(): string
    {
        return "EntityRevision ({$this->entityType}#" . UuidUtil::short($this->entityId) . ", {$this->action})";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?Uuid $id = null;

    /** Короткий строковый дискриминатор версионируемой сущности — 'ticket' и т.д. */
    #[ORM\Column(length: 32)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $entityType = null;

    // uuid, а не голый int (06.09.2026, переход на UUID-PK) — entityId
    // полиморфный (не настоящая ORM-связь, см. докблок класса), ссылается
    // на ID сущности любого типа из ENTITIES — все они теперь Uuid.
    #[ORM\Column(type: 'uuid')]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?Uuid $entityId = null;

    /**
     * ID сущности, которой непосредственно принадлежит entityId, если она
     * есть — прямая родительская связь (FK), а не самая старшая в цепочке.
     * Для entityType=chat_message — ID Chat (ChatMessage.chat), для
     * review — ID Ticket (Review.ticket), для tech_support_message — ID
     * TechSupport (TechSupportMessage.techSupport). Для entityType=ticket
     * родителя нет (Ticket — корень иерархии) — null. Для
     * entityType=multiple_image — ID той сущности, которой принадлежало
     * фото (см. AbstractApiHelperController::logImagesDeletion). Одна
     * запись может описывать сразу НЕСКОЛЬКО удалённых фото за один запрос
     * (см. $snapshot) — parentId у них общий, это ID их владельца, а не
     * какого-то конкретного фото из списка.
     */
    #[ORM\Column(type: 'uuid', nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?Uuid $parentId = null;

    /**
     * Короткое имя класса сущности, которой принадлежит $parentId (или
     * самого себя — 'Ticket' у entityType=ticket, ему принадлежать
     * нечему). См. ENTITIES для перевода и подробное объяснение разницы с
     * entityType там же.
     */
    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $entity = null;

    /** ACTION_UPDATED | ACTION_DELETED */
    #[ORM\Column(length: 16)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $action = null;

    /**
     * При update — предыдущие значения изменённых полей (только то, что
     * реально поменялось, не весь объект). При delete — снимок удалённых
     * данных. Форму снапшота решает писатель (см. TicketListener).
     */
    #[ORM\Column(type: 'json')]
    #[Groups([G::ENTITY_REVISIONS])]
    private array $snapshot = [];

    /**
     * Кто внёс изменение/удаление. onDelete: SET NULL — при удалении
     * пользователя сама запись аудита не пропадает, теряется только эта
     * связь (см. $actorLabel — денормализованный снимок email на такой
     * случай, обычная строковая колонка, ни от какого FK не зависит и
     * этим каскадом не затрагивается).
     */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[ApiProperty(writable: false)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?User $actor = null;

    /**
     * Снимок данных автора на момент записи ($actorLabel — email,
     * $actorId/$actorName/$actorSurname — остальное) — заполняется
     * автоматически в setActor(), писателям (листенерам) ничего отдельно
     * делать не нужно. В отличие от $actor (FK, живая связь) переживает
     * удаление аккаунта: когда $actor станет null через onDelete SET NULL,
     * эти поля останутся как были — единственный способ узнать, кто сделал
     * правку/удаление, если автора уже нет в системе. $actorId — обычная
     * колонка без FK (умышленно: FK со SET NULL стёр бы его вместе с
     * $actor), поэтому переживает удаление точно так же.
     */
    #[ORM\Column(nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $actorLabel = null;

    // name задано явно: без него Doctrine дала бы ту же колонку actor_id,
    // что уже занята FK-полем $actor выше (обе — camelCase actorId).
    // uuid, а не голый int (06.09.2026, переход на UUID-PK) — снимок
    // User::$id, теперь тоже Uuid (см. setActor() ниже).
    #[ORM\Column(name: 'actor_id_snapshot', type: 'uuid', nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?Uuid $actorId = null;

    #[ORM\Column(nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $actorName = null;

    #[ORM\Column(nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $actorSurname = null;

    /** Опциональная причина — в основном для модераторских удалений. */
    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?string $reason = null;

    /**
     * Когда запись можно удалить (см. app:prune-entity-revisions).
     * null = retention отключён, хранится бессрочно.
     */
    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups([G::ENTITY_REVISIONS])]
    private ?DateTimeImmutable $expiresAt;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getEntityType(): ?string
    {
        return $this->entityType;
    }

    public function setEntityType(string $entityType): static
    {
        $this->entityType = $entityType;
        return $this;
    }

    public function getEntityId(): ?Uuid
    {
        return $this->entityId;
    }

    public function setEntityId(Uuid $entityId): static
    {
        $this->entityId = $entityId;
        return $this;
    }

    public function getParentId(): ?Uuid
    {
        return $this->parentId;
    }

    public function setParentId(?Uuid $parentId): static
    {
        $this->parentId = $parentId;
        return $this;
    }

    public function getEntity(): ?string
    {
        return $this->entity;
    }

    public function setEntity(?string $entity): static
    {
        $this->entity = $entity;
        return $this;
    }

    public function getAction(): ?string
    {
        return $this->action;
    }

    public function setAction(string $action): static
    {
        $this->action = $action;
        return $this;
    }

    public function getSnapshot(): array
    {
        return $this->snapshot;
    }

    public function setSnapshot(array $snapshot): static
    {
        $this->snapshot = $snapshot;
        return $this;
    }

    public function getActor(): ?User
    {
        return $this->actor;
    }

    /**
     * Заодно снимает email/id/имя/фамилию автора — единожды здесь, а не в
     * каждом писателе (TicketListener/ChatMessageListener/…). Снимок
     * делается ТОЛЬКО при передаче реального User — setActor(null) его не
     * трогает, чтобы явный вызов с null (если такой понадобится) не стирал
     * то, что уже записано.
     */
    public function setActor(?User $actor): static
    {
        $this->actor = $actor;

        if ($actor !== null) {
            $this->actorLabel   = $actor->getContact();
            $this->actorId      = $actor->getId();
            $this->actorName    = $actor->getName();
            $this->actorSurname = $actor->getSurname();
        }

        return $this;
    }

    public function getActorLabel(): ?string
    {
        return $this->actorLabel;
    }

    public function getActorId(): ?Uuid
    {
        return $this->actorId;
    }

    public function getActorName(): ?string
    {
        return $this->actorName;
    }

    public function getActorSurname(): ?string
    {
        return $this->actorSurname;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): static
    {
        $this->reason = $reason;
        return $this;
    }

    public function getExpiresAt(): ?DateTimeImmutable
    {
        return $this->expiresAt;
    }

    /** null отключает retention для этой конкретной записи — хранится бессрочно. */
    public function setExpiresAt(?DateTimeImmutable $expiresAt): static
    {
        $this->expiresAt = $expiresAt;
        return $this;
    }

    /**
     * getSnapshotSummary() — из SnapshotSummaryTrait. Виртуальный геттер, НЕ
     * ORM-поле — единственный чистый способ показать это в EasyAdmin:
     * биндить поле формы напрямую на $snapshot (Doctrine json-колонка)
     * нельзя, EasyAdmin определяет тип виджета по маппингу колонки и падает
     * на "Array to string conversion" независимо от класса Field.
     *
     * Строки уже экранированы и разделены реальным "<br>" (дефолт
     * getSnapshotSummary), а не "\n": EntityRevisionCrudController
     * показывает это поле через TextEditorField (Trix), а форма
     * редактирования отдаёт значение геттера Trix-редактору напрямую как
     * HTML-источник — обычный "\n" в HTML визуально схлопывается (как в
     * любом браузере), тогда как "<br>" сохраняется. На детальной странице
     * поле рендерится через шаблон crud/field/text (см. setTemplateName в
     * контроллере), который выводит значение как доверенный raw HTML —
     * повторного экранирования не будет.
     */
    protected function getFieldLabels(): array
    {
        return self::FIELD_LABELS;
    }
}
