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
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};

export const getUserRole = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userRole');
};

