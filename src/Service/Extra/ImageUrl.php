<?php

namespace App\Service\Extra;

/**
 * Сборка URL картинки и её вариантов для API (SingleImageTrait).
 *
 * Оригинал лежит в public/uploads/{папка}/{файл} (папку определяет
 * EntityDirectoryNamerService::directoryFor()). Варианты — превью и WebP —
 * строит Liip Imagine ПО ЗАПРОСУ по адресу
 *   /media/cache/resolve/{filter}/uploads/{папка}/{файл}
 * (фильтры описаны в config/packages/liip_imagine.yaml). Этот адрес всегда
 * одинаков для одной картинки — поэтому клиентский HTTP-кэш работает по
 * стабильному ключу; при первом обращении Liip строит файл и редиректит на
 * готовую статику (см. ImageResolveCacheSubscriber — редирект кэшируется).
 *
 * Имена фильтров — контракт с liip_imagine.yaml: менять только вместе с ним.
 */
final class ImageUrl
{
    /** Длинная сторона 480 px, WebP — ленты, карточки, аватары. */
    public const string THUMBNAIL = 'thumb_480';

    /** Длинная сторона 800 px, WebP — крупное превью. */
    public const string MEDIUM = 'thumb_800';

    /** Оригинал целиком (до 2400 px) в WebP — для старых тяжёлых PNG/JPEG. */
    public const string WEBP = 'webp_full';

    /** Оригинал: /uploads/{папка}/{файл}. */
    public static function original(object $entity, ?string $file): ?string
    {
        return $file ? '/' . self::relativePath($entity, $file) : null;
    }

    /** Вариант по имени фильтра: /media/cache/resolve/{filter}/uploads/{папка}/{файл}. */
    public static function variant(object $entity, ?string $file, string $filter): ?string
    {
        return $file ? "/media/cache/resolve/{$filter}/" . self::relativePath($entity, $file) : null;
    }

    /** Путь относительно public/: uploads/{папка}/{файл}. */
    public static function relativePath(object $entity, string $file): string
    {
        return 'uploads/' . EntityDirectoryNamerService::directoryFor($entity) . '/' . $file;
    }
}
