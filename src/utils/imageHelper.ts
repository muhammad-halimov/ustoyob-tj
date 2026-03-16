const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Uploads one or more files to `/api/{endpoint}/{id}/upload-photo` in a single multipart/form-data POST.
 * Files are sent as `imageFile[]` — the backend handles both single and multiple files.
 */
export const uploadPhotos = async (
    endpoint: string,
    id: number | string,
    files: File[],
    token?: string | null,
): Promise<any> => {
    const formData = new FormData();
    for (const file of files) {
        formData.append('imageFile[]', file);
    }
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${id}/upload-photo`, {
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

export const checkImageExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
};

export const getAvatarUrl = async (userData: any, userType: 'client' | 'master'): Promise<string | null> => {
    if (!userData?.image) return null;

    let imagePath = userData.image;
    if (imagePath.includes('/')) {
        imagePath = imagePath.split('/').pop() || imagePath;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const pathsToCheck = [
        `${API_BASE_URL}/images/profile_photos/${imagePath}`,
        `${API_BASE_URL}/${userData.image}`,
        userData.image,
        `${API_BASE_URL}/uploads/profile_photos/${imagePath}`,
        `${API_BASE_URL}/uploads/${userType}s/${imagePath}`,
        `${API_BASE_URL}/images/${userType}s/${imagePath}`
    ];

    for (const path of Array.from(new Set(pathsToCheck.filter(Boolean)))) {
        if (path && path !== "../fonTest6.png" && await checkImageExists(path)) {
            return path;
        }
    }

    return null;
};

export const getFormattedDate = (dateString?: string): string => {
    if (dateString) {
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            // fall through to default
        }
    }
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
};

export const getGenderDisplay = (gender: string): string => {
    const genderMap: Record<string, string> = {
        'gender_female': 'Женский',
        'gender_male': 'Мужской',
        'female': 'Женский',
        'male': 'Мужской',
        'other': 'Другой'
    };
    return genderMap[gender] || gender;
};

/**
 * Resolves a user's avatar URL from their profile data.
 * Handles local paths, absolute paths, and external OAuth URLs.
 * Falls back to `fallback` (default: '/default_user.png') when no image is available.
 */
export const getAuthorAvatar = (
    user: { image?: string | null; imageExternalUrl?: string | null } | null | undefined,
    fallback = '../default_user.png'
): string => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    if (!user) return fallback;

    // Priority 1: local image
    if (user.image) {
        if (user.image.startsWith('http')) return user.image;
        if (user.image.startsWith('/')) return `${API_BASE_URL}${user.image}`;
        return `${API_BASE_URL}/images/profile_photos/${user.image}`;
    }

    // Priority 2: external OAuth URL (Google, VK, etc.)
    if (user.imageExternalUrl?.trim()) return user.imageExternalUrl.trim();

    return fallback;
};