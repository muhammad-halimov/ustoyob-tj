<?php

namespace App\Entity\Trait\Readable;

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
        return $this->image ?? '';
    }

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
    #[Groups([
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
    ])]
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
