export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('selectedCity'); // Можно оставить, если нужно
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};

export const getUserRole = (): 'client' | 'master' | null => {
    if (typeof window === 'undefined') return null;
    const role = localStorage.getItem('userRole');
    console.log('Raw role from localStorage:', role);

    // Преобразуем ROLE_CLIENT в client, ROLE_MASTER в master
    if (role === 'ROLE_CLIENT' || role === 'client') {
        return 'client';
    } else if (role === 'ROLE_MASTER' || role === 'master') {
        return 'master';
    }
    return null;
};

// Функция для установки роли (если нужно)
export const setUserRole = (role: 'client' | 'master'): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('userRole', role === 'client' ? 'ROLE_CLIENT' : 'ROLE_MASTER');
};

// Дополнительная функция для получения данных пользователя
export const getUserData = (): UserData | null => {
    if (typeof window === 'undefined') return null;
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return null;

    try {
        return JSON.parse(userDataStr);
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
};

interface UserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    approved?: boolean;
    roles: string[];
}