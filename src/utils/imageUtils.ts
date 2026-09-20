import { API_BASE_URL } from './configUtils';
import { universalApiRequest } from './apiUtils';
import { API_ROUTES } from '../app/routers/routes';
import { compressImageFile } from './imageCompressUtils';
import type { PhotoSource, ImageFields } from '../entities';

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

    return universalApiRequest(API_ROUTES.UPLOAD_IMAGES(endpoint, id), {
        method: 'POST',
        body: formData,
        headers: guestToken ? { 'X-Guest-Access-Token': guestToken } : undefined,
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