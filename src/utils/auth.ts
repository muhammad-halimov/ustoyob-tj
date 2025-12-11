// Константы для хранения ключей в localStorage
const AUTH_TOKEN_KEY = 'authToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const USER_ROLE_KEY = 'userRole';
const USER_DATA_KEY = 'userData';
const USER_EMAIL_KEY = 'userEmail';

// Время жизни токена (1 час)
const TOKEN_LIFETIME_HOURS = 1;

export interface UserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    approved?: boolean;
    roles: string[];
    // Добавляем другие поля, которые могут прийти из API
    image?: string;
    occupation?: any[];
    createdAt?: string;
    updatedAt?: string;
}

// Базовые функции для работы с токеном
export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    // Автоматически устанавливаем время истечения при сохранении токена
    setAuthTokenExpiry();
};

export const removeAuthToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem('selectedCity'); // Можно оставить, если нужно
};

// Функции для работы со временем истечения токена
export const getAuthTokenExpiry = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_EXPIRY_KEY);
};

export const setAuthTokenExpiry = (expiry?: string): void => {
    if (typeof window === 'undefined') return;

    let expiryDate: Date;

    if (expiry) {
        // Используем переданную дату истечения
        expiryDate = new Date(expiry);
    } else {
        // Создаем новую дату истечения (текущее время + 1 час)
        expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + TOKEN_LIFETIME_HOURS);
    }

    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryDate.toISOString());
};

export const removeAuthTokenExpiry = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Функция проверки, не истек ли токен
export const isTokenExpired = (): boolean => {
    const expiry = getAuthTokenExpiry();
    if (!expiry) return true; // Если нет информации об истечении, считаем истекшим

    const now = new Date();
    const expiryDate = new Date(expiry);
    return now >= expiryDate;
};

// Функция проверки, скоро ли истечет токен (за 5 минут до истечения)
export const isTokenAboutToExpire = (bufferMinutes: number = 5): boolean => {
    const expiry = getAuthTokenExpiry();
    if (!expiry) return true;

    const now = new Date();
    const expiryDate = new Date(expiry);
    const bufferTime = bufferMinutes * 60 * 1000; // минуты в миллисекундах

    return expiryDate.getTime() - now.getTime() < bufferTime;
};

// Обновленная функция проверки аутентификации
export const isAuthenticated = (): boolean => {
    const token = getAuthToken();
    if (!token) return false;

    // Проверяем, не истек ли токен
    return !isTokenExpired();
};

// Полная очистка всех данных аутентификации
export const clearAuthData = (): void => {
    removeAuthToken();
    removeAuthTokenExpiry();
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
};

// Функции для работы с ролью пользователя
export const getUserRole = (): 'client' | 'master' | null => {
    if (typeof window === 'undefined') return null;
    const role = localStorage.getItem(USER_ROLE_KEY);

    if (role === 'ROLE_CLIENT' || role === 'client') {
        return 'client';
    } else if (role === 'ROLE_MASTER' || role === 'master') {
        return 'master';
    }
    return null;
};

export const setUserRole = (role: 'client' | 'master'): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_ROLE_KEY, role === 'client' ? 'ROLE_CLIENT' : 'ROLE_MASTER');
};

// Функции для работы с данными пользователя
export const getUserData = (): UserData | null => {
    if (typeof window === 'undefined') return null;
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    if (!userDataStr) return null;

    try {
        return JSON.parse(userDataStr);
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
};

export const setUserData = (data: UserData): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
};

// Функция для работы с email пользователя
export const getUserEmail = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_EMAIL_KEY);
};

export const setUserEmail = (email: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_EMAIL_KEY, email);
};

// Функция для обновления данных пользователя (например, после подтверждения аккаунта)
export const updateUserData = (updates: Partial<UserData>): UserData | null => {
    const currentData = getUserData();
    if (!currentData) return null;

    const updatedData = { ...currentData, ...updates };
    setUserData(updatedData);
    return updatedData;
};

// Функция для проверки, подтвержден ли аккаунт пользователя
export const isUserApproved = (): boolean => {
    const userData = getUserData();
    return userData?.approved === true;
};

// Функция для установки времени истечения токена из JWT (если токен содержит exp)
export const setTokenExpiryFromJWT = (token: string): void => {
    try {
        // JWT токен состоит из трех частей, разделенных точками
        const payload = token.split('.')[1];
        if (!payload) return;

        // Декодируем base64
        const decodedPayload = JSON.parse(atob(payload));

        // Если в токене есть поле exp (expiration time в секундах)
        if (decodedPayload.exp) {
            // Преобразуем секунды в миллисекунды
            const expiryDate = new Date(decodedPayload.exp * 1000);
            setAuthTokenExpiry(expiryDate.toISOString());
            console.log('Token expiry set from JWT:', expiryDate);
        }
    } catch (error) {
        console.error('Error parsing JWT token:', error);
        // Если не удалось распарсить JWT, используем стандартное время
        setAuthTokenExpiry();
    }
};

// Функция для автоматической проверки и обновления токена
export const setupTokenRefresh = async (
    onTokenAboutToExpire?: () => Promise<boolean>,
    onTokenExpired?: () => void
): Promise<void> => {
    if (typeof window === 'undefined') return;

    // Проверяем токен каждую минуту
    setInterval(async () => {
        const token = getAuthToken();
        if (!token) return;

        // Если токен истек
        if (isTokenExpired()) {
            console.log('Token has expired');
            if (onTokenExpired) {
                onTokenExpired();
            } else {
                clearAuthData();
            }
            return;
        }

        // Если токен скоро истечет (за 5 минут)
        if (isTokenAboutToExpire()) {
            console.log('Token is about to expire, attempting refresh...');

            let refreshSuccess = false;

            // Если предоставлена функция для обновления токена
            if (onTokenAboutToExpire) {
                try {
                    refreshSuccess = await onTokenAboutToExpire();
                } catch (error) {
                    console.error('Error refreshing token:', error);
                }
            }

            // Если обновление не удалось, очищаем данные
            if (!refreshSuccess) {
                console.log('Token refresh failed, clearing auth data');
                clearAuthData();
                if (onTokenExpired) {
                    onTokenExpired();
                }
            }
        }
    }, 60000); // Проверка каждую минуту (60000 мс)
};

// Вспомогательная функция для получения полного имени пользователя
export const getUserFullName = (): string | null => {
    const userData = getUserData();
    if (!userData) return null;

    const name = userData.name || '';
    const surname = userData.surname || '';

    return `${name} ${surname}`.trim() || userData.email || null;
};

// Вспомогательная функция для проверки роли
export const hasRole = (role: 'client' | 'master' | string): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;

    // Если передана строка с ROLE_, преобразуем для сравнения
    if (role.includes('ROLE_')) {
        if (role === 'ROLE_CLIENT') return userRole === 'client';
        if (role === 'ROLE_MASTER') return userRole === 'master';
    }

    return userRole === role;
};