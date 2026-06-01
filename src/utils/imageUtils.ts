import { API_BASE_URL } from './configUtils';
import { getAuthToken } from './authUtils';

// ─── Форматирование URL изображений ──────────────────────────
const buildImageUrl = (imagePath: string, defaultFolder: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
    return `${API_BASE_URL}/${defaultFolder}/${imagePath}`;
};

export const formatTicketImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/tickets');

export const formatProfileImageUrl = (imagePath: string): string => buildImageUrl(imagePath, 'uploads/users');

/**
 * Uploads one or more files to `/api/{endpoint}/{id}/upload-images` in a single multipart/form-data POST.
 * Files are sent as `imageFile[]` — the backend handles both single and multiple files.
 */
export const uploadPhotos = async (
    endpoint: string,
    id: number | string,
    files: File[],
    _token?: string | null, // deprecated: auth handled internally via getAuthToken()
): Promise<any> => {
    const formData = new FormData();
    for (const file of files) {
        formData.append('imageFile[]', file);
    }
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${id}/upload-images`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }
    return response.json().catch(() => null);
};
/**
 * Resolves a user's avatar URL from their profile data.
 * Handles local paths, absolute paths, and external OAuth URLs.
 * Falls back to `fallback` (default: '/img/icons/icons/default_user.png') when no image is available.
 */
export const getAuthorAvatar = (
    user: { image?: string | null; imageExternalUrl?: string | null } | null | undefined,
    fallback = '/img/icons/icons/default_user.png'
): string => {
    if (!user) return fallback;

    // Priority 1: local image
    if (user.image) {
        if (user.image.startsWith('http')) return user.image;
        if (user.image.startsWith('/')) return `${API_BASE_URL}${user.image}`;
        return `${API_BASE_URL}/uploads/users/${user.image}`;
    }

    // Priority 2: external OAuth URL (Google, VK, etc.)
    if (user.imageExternalUrl?.trim()) return user.imageExternalUrl.trim();

    return fallback;
};
