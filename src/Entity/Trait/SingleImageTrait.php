<?php

namespace App\Entity\Trait;

use ApiPlatform\Metadata\ApiProperty;
use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

/**
 * Трейт для одиночного изображения.
 *
 * Подключается к любой entity у которой одно изображение —
 * Category, City, District, Province, User и т.д.
 *
 * Требования к классу который использует трейт:
 *   - #[ORM\HasLifecycleCallbacks] — нужен для CreatedAtTrait/UpdatedAtTrait
 *   - #[Vich\Uploadable]          — нужен для VichUploader
 *
 * Mapping 'default_photos' — единый для всех сущностей.
 * Папка определяется через EntityDirectoryNamer по классу сущности.
 */
trait SingleImageTrait
{
    use CreatedAtTrait, UpdatedAtTrait;

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
    #[ApiProperty(writable: false)]
    private ?File $imageFile = null;

    /**
     * Имя файла изображения в хранилище.
     * Полный URL формируется через VichUploader на уровне сериализации.
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups([
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',

        'favorites:read',
        'occupations:read',

        'cities:read',
        'districts:read',
        'provinces:read',

        'masters:read',
        'clients:read',

        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',
        'appeal:user:read',

        'reviews:read',
        'reviewsClient:read',

        'galleries:read',

        'chats:read',
        'chatMessages:read',

        'techSupport:read',

        'blackLists:read',

        'user:public:read',
    ])]
    protected ?string $image = null;

    /**
     * Порядок сортировки изображения в коллекции.
     * Для одиночных изображений всегда 0.
     * Для MultipleImage используется для упорядочивания галереи.
     */
    #[ORM\Column(options: ['default' => 0])]
    #[Groups([
        'categories:read',

        'masterTickets:read',
        'clientTickets:read',

        'favorites:read',
        'occupations:read',

        'cities:read',
        'districts:read',
        'provinces:read',

        'masters:read',
        'clients:read',

        'appeal:read',
        'appeal:chat:read',
        'appeal:ticket:read',

        'reviews:read',
        'reviewsClient:read',

        'galleries:read',

        'chats:read',
        'chatMessages:read',

        'techSupport:read',

        'blackLists:read',

        'user:public:read',
    ])]
    protected int $position = 0;

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

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }
}
