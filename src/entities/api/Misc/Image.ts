import type { User } from '../User';

/**
 * Поля, которые бэк добавляет к КАЖДОЙ сущности с `image` (API_REFERENCE.md §14): готовые
 * URL превью/WebP и BlurHash-заглушка. Все — read-only, относительные к хосту API и
 * опциональные (старые ответы/кэш их не содержат; `imageBlurhash` бывает `null`, пока
 * не прогнан backfill на сервере).
 */
export interface ImageFields {
    /** Оригинал: `/uploads/<folder>/<file>` — клиенту больше не нужно знать папку. */
    imageUrl?: string | null;
    /** WebP, длинная сторона 480 px — ленты, карточки, аватары. */
    imageThumbnail?: string | null;
    /** WebP, 800 px — крупное превью (детальная страница). */
    imageMedium?: string | null;
    /** Оригинал целиком в WebP (≤2400 px) — для полноэкранной галереи. */
    imageWebp?: string | null;
    /** ~28 символов BlurHash для мгновенной размытой заглушки. */
    imageBlurhash?: string | null;
}

/** Одно фото со всеми вариантами, уже с абсолютными URL — то, что получает UI (Carousel и т.п.). */
export interface PhotoSource {
    /** Оригинал (fallback для любого варианта). */
    url: string;
    thumbnail?: string;
    medium?: string;
    webp?: string;
    blurhash?: string;
}

// MultipleImage на бэке — одна сущность для всего. На фронте — один тип.
export interface Image extends ImageFields {
    id: string | number;
    image: string;
    priority?: number;
    author?: User | null;
    createdAt?: string | null;
}
