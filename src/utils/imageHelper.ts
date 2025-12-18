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