import { API_BASE_URL } from './configUtils';
import { universalApiRequest } from './apiUtils';
import { getAuthToken } from './authUtils';
import { API_ROUTES } from '../app/routers/routes';
import { compressImageFile } from './imageCompressUtils';
import type { PhotoSource, ImageFields, ResolvedImage } from '../entities';

// ─── Форматирование URL изображений ──────────────────────────
const buildImageUrl = (imagePath: string, defaultFolder: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    // /media/ — Liip Imagine (превью/WebP, поля imageThumbnail/imageMedium/imageWebp): тоже относительно хоста API.
    if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/') || imagePath.startsWith('/media/')) return `${API_BASE_URL}${imagePath}`;
    return `${API_BASE_URL}/${defaultFolder}/${imagePath}`;
};

export const formatTicketImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/tickets');

export const formatProfileImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/users');

/**
 * Собирает `PhotoSource` из объекта с `image` + `ImageFields` (API_REFERENCE.md §14).
 * Любой вариант, которого бэк не прислал (старый кэш/ответ), просто отсутствует — потребитель
 * падает обратно на `url`. Оригинал берётся из `imageUrl`, иначе строится из имени файла.
 */
export const toPhotoSource = (
    img: { image?: string | null } & ImageFields,
    defaultFolder = 'uploads/tickets',
): PhotoSource => ({
    url: buildImageUrl(img.imageUrl || img.image || '', defaultFolder),
    thumbnail: img.imageThumbnail ? buildImageUrl(img.imageThumbnail, defaultFolder) : undefined,
    medium: img.imageMedium ? buildImageUrl(img.imageMedium, defaultFolder) : undefined,
    webp: img.imageWebp ? buildImageUrl(img.imageWebp, defaultFolder) : undefined,
    blurhash: img.imageBlurhash || undefined,
});

export type ImageVariant = 'thumbnail' | 'medium' | 'webp' | 'full';

type ImageEntity = { image?: string | null; imageExternalUrl?: string | null } & ImageFields;

/**
 * Единая точка выбора картинки для показа (API_REFERENCE.md §14). Для своей загрузки берёт нужный
 * вариант (`thumbnail` 480 px — ленты/аватары, `medium` 800 px, `webp` — полный WebP, `full` —
 * оригинал), а оригинал кладёт в `fallbacks` — если превью не сгенерировалось/битый кэш, `<Img>`
 * откатится на него, а не на пустоту. Для OAuth-аватара (`imageExternalUrl`) вариантов нет.
 * Возвращает `null`, если у сущности нет вообще никакой картинки.
 */
export const resolveImage = (
    entity: ImageEntity | null | undefined,
    variant: ImageVariant = 'thumbnail',
    defaultFolder = 'uploads/tickets',
): ResolvedImage | null => {
    if (!entity) return null;

    const original = entity.imageUrl || entity.image
        ? buildImageUrl(entity.imageUrl || entity.image || '', defaultFolder)
        : '';

    if (original) {
        const variantPath = {
            thumbnail: entity.imageThumbnail,
            medium: entity.imageMedium ?? entity.imageThumbnail,
            webp: entity.imageWebp,
            full: null,
        }[variant];
        const variantUrl = variantPath ? buildImageUrl(variantPath, defaultFolder) : '';
        const src = variantUrl || original;
        return {
            src,
            fallbacks: src !== original ? [original] : undefined,
            blurhash: entity.imageBlurhash || undefined,
        };
    }

    const external = entity.imageExternalUrl?.trim();
    if (external) return { src: external, external: true };

    return null;
};

/** Вытаскивает поля превью/BlurHash из «сырой» сущности API — для мест, которые пересобирают объекты вручную и иначе теряют их. */
export const pickImageFields = (raw: ImageFields | null | undefined): ImageFields => ({
    imageUrl: raw?.imageUrl,
    imageThumbnail: raw?.imageThumbnail,
    imageMedium: raw?.imageMedium,
    imageWebp: raw?.imageWebp,
    imageBlurhash: raw?.imageBlurhash,
});

/**
 * Существующее фото из API → элемент `Grid` (`PhotoItem`, type 'existing') с превью и BlurHash.
 * Сетка форм показывает миниатюру, а не оригинал.
 */
export const toExistingPhoto = (
    img: { id: string | number; image: string } & ImageFields,
    folder: string,
) => {
    const thumb = resolveImage(img, 'thumbnail', folder);
    const hasVariant = !!img.imageThumbnail;
    return {
        type: 'existing' as const,
        id: img.id,
        image: img.image,
        thumbnail: hasVariant ? thumb?.src : undefined,
        blurhash: thumb?.blurhash,
    };
};

/** `resolveImage` для аватаров пользователей (папка `uploads/users`, превью 480 px). */
export const resolveAvatar = (
    user: ImageEntity | null | undefined,
    variant: ImageVariant = 'thumbnail',
): ResolvedImage | null => resolveImage(user, variant, 'uploads/users');

/** Screenshots attached directly to a TechSupport ticket (`ticket.images`). */
export const formatTechSupportImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/tech_supports');

/** Screenshots attached to a TechSupportMessage reply (`message.images`) — separate folder from the ticket's own. */
export const formatTechSupportMessageImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/tech_support_messages');

/**
 * Uploads one or more files to `/api/{endpoint}/{id}/upload-images` in a single multipart/form-data POST.
 * Files are sent as `imageFile[]` — the backend handles both single and multiple files.
 *
 * Auth is handled internally by universalApiRequest (Authorization: Bearer <token> when logged in).
 * For anonymous uploads to endpoints that support guest access (e.g. TechSupport),
 * pass `guestToken` — it's sent as `X-Guest-Access-Token`.
 */
export const uploadPhotos = async (
    endpoint: string,
    id: number | string,
    files: File[],
    guestToken?: string | null,
): Promise<any> => {
    // Сжимаем до отправки (canvas) — см. imageCompressUtils; аватар (`users`) сильнее, он
    // показывается только маленьким. Сбой сжатия = отправляем оригинал, загрузка не ломается.
    const maxSide = endpoint === 'users' ? 1024 : 1920;
    const prepared = await Promise.all(files.map(file => compressImageFile(file, { maxSide })));

    const formData = new FormData();
    for (const file of prepared) {
        formData.append('imageFile[]', file);
    }

    // Многие вызовы передают сюда обычный JWT — он уже уходит в Authorization. Лишний
    // X-Guest-Access-Token в нативном приложении (кросс-доменный запрос) провоцирует CORS-preflight,
    // а бэк этот заголовок в Access-Control-Allow-Headers не отдаёт → загрузка падает с 400.
    const sendGuestHeader = !!guestToken && guestToken !== getAuthToken();

    return universalApiRequest(API_ROUTES.UPLOAD_IMAGES(endpoint, id), {
        method: 'POST',
        body: formData,
        headers: sendGuestHeader ? { 'X-Guest-Access-Token': guestToken } : undefined,
        locale: false, // upload endpoint doesn't use ?locale=, matches previous behavior
    });
};

/**
 * Resolves a user's avatar URL from their profile data.
 * Handles local paths, absolute paths, and external OAuth URLs.
 * Falls back to `fallback` (default: '/img/icons/icons/default_user.png') when no image is available.
 */
export const getAuthorAvatar = (
    user: ({ image?: string | null; imageExternalUrl?: string | null } & Pick<ImageFields, 'imageThumbnail'>) | null | undefined,
    fallback = '/img/icons/icons/default_user.png'
): string => {
    if (!user) return fallback;

    // Превью 480 px (WebP) вместо оригинала — аватары нигде не показываются крупнее.
    if (user.imageThumbnail) return buildImageUrl(user.imageThumbnail, 'uploads/users');

    if (user.image) {
        if (user.image.startsWith('http')) return user.image;
        if (user.image.startsWith('/')) return `${API_BASE_URL}${user.image}`;
        return `${API_BASE_URL}/uploads/users/${user.image}`;
    }

    if (user.imageExternalUrl?.trim()) return user.imageExternalUrl.trim();

    return fallback;
};