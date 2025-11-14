export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
    localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
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
    localStorage.setItem('userRole', role === 'client' ? 'ROLE_CLIENT' : 'ROLE_MASTER');
};