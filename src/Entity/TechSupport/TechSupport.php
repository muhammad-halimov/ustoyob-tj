<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiAdminApiTechSupportController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetAllTechSupportsController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetMyTechSupportsController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetTechSupportController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetTechSupportInboxTokenController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiGetTechSupportSubscribeTokenController;
use App\Controller\Api\CRUD\GET\TechSupport\TechSupport\ApiUserApiTechSupportController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\ApiAssignTechSupportController;
use App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport\ApiPatchTechSupportController;
use App\Controller\Api\CRUD\POST\Image\Image\ApiPostUniversalImageController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\ApiPostMarkTechSupportReadController;
use App\Controller\Api\CRUD\POST\TechSupport\TechSupport\ApiPostTechSupportController;
use App\Dto\Image\ImageInput;
use App\Dto\TechSupport\TechSupportAssignInput;
use App\Dto\TechSupport\TechSupportPatchInput;
use App\Dto\TechSupport\TechSupportPostInput;
use App\Entity\Contract\HasImagesInterface;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\Readable\AppealReasonTrait;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\G;
use App\Entity\Trait\Readable\PriorityTrait;
use App\Entity\Trait\Readable\SlugTrait;
use App\Entity\Trait\Readable\TitleTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Serializer\Attribute\Context;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ORM\Entity(repositoryClass: TechSupportRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        // ROLE_ADMIN: список всех тикетов в системе. Опционально ?status= фильтр.
        new GetCollection(
            uriTemplate: '/tech-supports',
            controller: ApiGetAllTechSupportsController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // Любой авторизованный: мои тикеты (где я автор ИЛИ администрант).
        new GetCollection(
            uriTemplate: '/tech-supports/me',
            controller: ApiGetMyTechSupportsController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // ROLE_ADMIN: тикеты конкретного пользователя по его ID.
        new GetCollection(
            uriTemplate: '/tech-supports/user/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiUserApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // ROLE_ADMIN: тикеты, назначенные на конкретного администратора по его ID.
        new GetCollection(
            uriTemplate: '/tech-supports/admin/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiAdminApiTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // Автор / администрант / ROLE_ADMIN: получить один тикет по ID.
        new Get(
            uriTemplate: '/tech-supports/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiGetTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // [MERCURE] Эндпоинт для получения подписного JWT-токена — аналог
        // /chats/{id}/subscribe (см. Chat). Фронтенд вызывает его перед
        // открытием SSE-соединения на топик "tech-support:{id}".
        new Get(
            uriTemplate: '/tech-supports/{id}/subscribe',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiGetTechSupportSubscribeTokenController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
        ),
        // [MERCURE] Токен для подписки на ВСЕ тикеты техподдержки пользователя
        // одновременно — аналог /chats/inbox-token (см. Chat).
        new Get(
            uriTemplate: '/tech-supports/inbox-token',
            controller: ApiGetTechSupportInboxTokenController::class,
            read: false,
        ),
        // Авторизованный или гость (без токена): создать новый тикет.
        // Гость обязан передать guestEmail для обратной связи.
        new Post(
            uriTemplate: '/tech-supports',
            controller: ApiPostTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportPostInput::class,
        ),
        // Автор: только смена статуса (по правилам машины состояний).
        // Админ: то же плюс title/reason/priority/description/images.
        new Patch(
            uriTemplate: '/tech-supports/{id}',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPatchTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportPatchInput::class,
        ),
        // ROLE_ADMIN: назначить администранта на тикет. Тело: { "administrant": <userId> }.
        new Patch(
            uriTemplate: '/tech-supports/{id}/assign',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiAssignTechSupportController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: TechSupportAssignInput::class,
        ),
        // Автор / администрант: пометить непрочитанные сообщения тикета прочитанными.
        // Аналог /chats/{id}/read (см. Chat).
        new Post(
            uriTemplate: '/tech-supports/{id}/read',
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPostMarkTechSupportReadController::class,
            deserialize: false,
        ),
        // Автор / администрант: загрузить фото напрямую к тикету (multipart/form-data, поле: imageFile[]).
        new Post(
            uriTemplate: '/tech-supports/{id}/upload-images',
            inputFormats: ['multipart' => ['multipart/form-data']],
            requirements: ['id' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'],
            controller: ApiPostUniversalImageController::class,
            normalizationContext: ['groups' => G::OPS_TECH_SUPPORT],
            input: ImageInput::class,
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class TechSupport implements HasImagesInterface
{
    use CreatedAtTrait, UpdatedAtTrait, TitleTrait, SlugTrait, DescriptionTrait, PriorityTrait, AppealReasonTrait;

    public function __construct()
    {
        $this->techSupportMessages = new ArrayCollection();
        $this->images              = new ArrayCollection();
    }

    public const array STATUSES = [
        'Новый' => 'new',
        'Заново открыто' => 'renewed',
        'В прогрессе' => 'in_progress',
        'Решено' => 'resolved',
        'Закрыто' => 'closed',
        'Заблокировано' => 'banned',
    ];

    /**
     * Терминальный статус, назначаемый только админом (см. ApiPatchTechSupportController::TRANSITIONS).
     * В отличие от 'closed' — автор полностью теряет возможность взаимодействовать
     * с тикетом (новые сообщения, загрузка фото): см. проверки в
     * ApiPostTechSupportMessageController и ApiPostUniversalImageController.
     */
    public const string STATUS_BANNED = 'banned';

    public const array PRIORITIES = [
        'Низкий' => 1,
        'Средний' => 2,
        'Высокий' => 3,
        'Экстренный' => 4,
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    private ?Uuid $id = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private ?string $status = null;

    /**
     * @var Collection<int, TechSupportMessage>
     */
    #[ORM\OneToMany(targetEntity: TechSupportMessage::class, mappedBy: 'techSupport', cascade: ['all'])]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[SerializedName('messages')]
    #[ApiProperty(writable: false)]
    private Collection $techSupportMessages;

    #[ORM\ManyToOne(inversedBy: 'techSupports')]
    #[ORM\JoinColumn(name: 'administrant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::TECH_SUPPORT_ADMIN,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    // Форсирует узкий набор полей ТОЛЬКО для вложенного User здесь: name,
    // surname, patronymic, lastSeen, image, imageExternalUrl (G::ADMINISTRANT_PUBLIC).
    // Полностью подменяет 'groups' в контексте нормализации значения этого
    // свойства — независимо от групп операции (TECH_SUPPORT/TECH_SUPPORT_MESSAGES
    // и т.д. сюда уже не просачиваются). См. User::$name и соседние поля.
    #[Context(normalizationContext: ['groups' => [G::ADMINISTRANT_PUBLIC]])]
    // readableLink форсирован явно: без него ApiProperty-эвристика решает
    // embed/IRI по пересечению групп операции с полным набором групп User,
    // и в связке с узкой ADMINISTRANT_PUBLIC-группой (и тем, что у User
    // несколько Get-операций: /users/me и /users/{id}) иногда схлопывается
    // в кривую нерезолвленную IRI-строку вместо объекта. readableLink: true
    // однозначно говорит сериализатору — всегда встраивать объект целиком.
    #[ApiProperty(writable: false, readableLink: true)]
    private ?User $administrant = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportsAsAuthor')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    /**
     * Email гостевого пользователя (не авторизован).
     * Заполняется только когда тикет создаётся без JWT-токена.
     * Нужен, чтобы администратор мог связаться с пользователем по почте.
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[ApiProperty(writable: false)]
    private ?string $guestEmail = null;

    /**
     * Токен гостевого пользователя (не авторизован).
     * Заполняется только когда тикет создаётся без JWT-токена.
     * Нужен, чтобы пользователь мог загрузить фото.
     */
    #[ORM\Column(length: 64, unique: true, nullable: true)]
    #[Groups([
        G::TECH_SUPPORT_GUEST_TOKEN, // ← новая группа, только для ответа POST /tech-supports
    ])]
    #[ApiProperty(writable: false)]
    private ?string $guestAccessToken = null;

    /**
     * Фотографии, прикреплённые напрямую к тикету (не через сообщение).
     * Загружаются через POST /tech-supports/{id}/upload-images.
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'techSupport', cascade: ['all'], orphanRemoval: true)]
    #[ORM\OrderBy(['priority' => 'ASC'])]
    #[Groups([
        G::TECH_SUPPORT,
    ])]
    #[ApiProperty(writable: false)]
    private Collection $images;

    public function getId(): ?Uuid
    {
        return $this->id;
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
            $techSupportMessage->setTechSupport($this);
        }

        return $this;
    }

    public function removeTechSupportMessage(TechSupportMessage $techSupportMessage): static
    {
        if ($this->techSupportMessages->removeElement($techSupportMessage)) {
            // set the owning side to null (unless already changed)
            if ($techSupportMessage->getTechSupport() === $this) {
                $techSupportMessage->setTechSupport(null);
            }
        }

        return $this;
    }

    public function getAdministrant(): ?User
    {
        return $this->administrant;
    }

    public function setAdministrant(?User $administrant): static
    {
        $this->administrant = $administrant;

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

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getGuestEmail(): ?string
    {
        return $this->guestEmail;
    }

    public function setGuestEmail(?string $guestEmail): static
    {
        $this->guestEmail = $guestEmail;
        return $this;
    }

    public function getGuestAccessToken(): ?string
    {
        return $this->guestAccessToken;
    }

    public function setGuestAccessToken(?string $guestAccessToken): static
    {
        $this->guestAccessToken = $guestAccessToken;
        return $this;
    }

    /** @return Collection<int, MultipleImage> */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setTechSupport($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            if ($image->getTechSupport() === $this) {
                $image->setTechSupport(null);
            }
        }

        return $this;
    }

    /**
     * [MERCURE] Возвращает имя топика этого тикета техподдержки.
     * Аналог Chat::getMercureTopic() — см. там общее объяснение.
     * Попадает в JSON-ответ как "mercureTopic": "tech-support:7".
     */
    #[Groups([G::TECH_SUPPORT, G::TECH_SUPPORT_MESSAGES])]
    #[SerializedName('mercureTopic')]
    public function getMercureTopic(): string
    {
        return "tech-support:{$this->id}";
    }
}
