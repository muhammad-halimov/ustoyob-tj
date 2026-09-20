<?php

namespace App\Entity\Trait\Readable;

use App\Service\Extra\ImageUrl;
use App\Service\Extra\UuidUtil;

use ApiPlatform\Metadata\ApiProperty;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

/**
 * Трейт для одиночного изображения.
 *
 * Подключается к любой entity у которой одно изображение —
 * Category, City, District, Province, User и т.д.
 *
 * Требование к классу который использует трейт:
 *   - #[Vich\Uploadable] — нужен для VichUploader
 *   - UpdatedAtTrait     — нужен для setImageFile (обновляет updatedAt)
 *
 * Mapping 'default_photos' — единый для всех сущностей.
 * Папка определяется через EntityDirectoryNamer по классу сущности.
 */
trait SingleImageTrait
{

    public function __toString(): string
    {
        return $this->image ?: ('#' . UuidUtil::short($this->id));
    }

    /**
     * Группы сериализации ВСЕХ полей картинки (image, imageUrl, imageThumbnail,
     * imageMedium, imageWebp, imageBlurhash) — одна константа, чтобы поля не
     * разъезжались по контекстам: где виден image, там же его превью/заглушка.
     */
    public const array IMAGE_GROUPS = [
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::OCCUPATIONS,
        G::CATEGORIES,
        G::UNITS,

        G::FAVORITES,
        G::BLACK_LISTS,
        G::GALLERIES,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,

        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,

        G::ADMINISTRANT_PUBLIC,
    ];

    /**
     * Виртуальное поле для загрузки файла через VichUploader.
     * Не хранится в БД — только в памяти во время запроса.
     * После загрузки Vich заполняет $image именем файла.
     */
    #[Vich\UploadableField(mapping: 'default_photos', fileNameProperty: 'image')]
    #[Assert\Image(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])]
    #[ApiProperty(readable: false, writable: false)]
    #[Ignore]
    private ?File $imageFile = null;

    /**
     * Имя файла изображения в хранилище.
     * Полный URL формируется через VichUploader на уровне сериализации.
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(self::IMAGE_GROUPS)]
    protected ?string $image = null;

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;

        return $this;
    }

    /**
     * BlurHash — крошечная строка (~28 символов) для мгновенной размытой
     * заглушки на клиенте (blurhash-декодер) на время загрузки настоящего
     * фото. Считается один раз при загрузке (ImageBlurhashListener) либо
     * командой app:images:backfill-blurhash для старых файлов; не редактируется
     * через API. null — ещё не посчитан (старое фото до backfill) или файл не
     * читается.
     */
    #[ORM\Column(length: 64, nullable: true)]
    #[Groups(self::IMAGE_GROUPS)]
    #[ApiProperty(writable: false)]
    protected ?string $imageBlurhash = null;

    /**
     * null, если самой картинки нет: устаревший хеш (после удаления файла) не
     * должен приезжать без фото.
     */
    public function getImageBlurhash(): ?string
    {
        return $this->image ? $this->imageBlurhash : null;
    }

    public function setImageBlurhash(?string $imageBlurhash): static
    {
        $this->imageBlurhash = $imageBlurhash;

        return $this;
    }

    /**
     * Готовые URL — клиенту не нужно знать, в какой папке uploads лежит файл
     * (раньше в API уходило только имя файла). Не хранятся в БД: вычисляются
     * из $image и класса сущности (см. ImageUrl). Превью и WebP строит Liip
     * Imagine по запросу (config/packages/liip_imagine.yaml), поэтому они
     * доступны и для старых фото без миграции файлов.
     *
     * imageUrl       — оригинал (/uploads/...).
     * imageThumbnail — WebP, длинная сторона 480 px: ленты, карточки, аватары.
     * imageMedium    — WebP, длинная сторона 800 px: крупное превью.
     * imageWebp      — оригинал целиком (до 2400 px) в WebP.
     */
    #[Groups(self::IMAGE_GROUPS)]
    #[ApiProperty(writable: false)]
    public function getImageUrl(): ?string
    {
        return ImageUrl::original($this, $this->image);
    }

    #[Groups(self::IMAGE_GROUPS)]
    #[ApiProperty(writable: false)]
    public function getImageThumbnail(): ?string
    {
        return ImageUrl::variant($this, $this->image, ImageUrl::THUMBNAIL);
    }

    #[Groups(self::IMAGE_GROUPS)]
    #[ApiProperty(writable: false)]
    public function getImageMedium(): ?string
    {
        return ImageUrl::variant($this, $this->image, ImageUrl::MEDIUM);
    }

    #[Groups(self::IMAGE_GROUPS)]
    #[ApiProperty(writable: false)]
    public function getImageWebp(): ?string
    {
        return ImageUrl::variant($this, $this->image, ImageUrl::WEBP);
    }

    /**
     * Возвращает файл только во время обработки загрузки.
     * После flush() всегда null — файл уже записан на диск.
     */
    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    /**
     * При установке файла обновляет updatedAt —
     * это сигнал для VichUploader что файл изменился и нужно перезаписать.
     */
    public function setImageFile(?File $imageFile): self
    {
        $this->imageFile = $imageFile;
        if ($imageFile !== null) {
            $this->updatedAt = new DateTime();
        }

        return $this;
    }
}
