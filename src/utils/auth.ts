// utils/auth.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin.ustoyob.tj';

// Константы для хранения ключей в localStorage
const AUTH_TOKEN_KEY = 'authToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const USER_ROLE_KEY = 'userRole';
const USER_DATA_KEY = 'userData';
const USER_EMAIL_KEY = 'userEmail';

// Время жизни токена (1 час)
const TOKEN_LIFETIME_HOURS = 1;

// Интерфейсы для типизации
export interface UserOccupation {
    id: number;
    title: string;
    [key: string]: unknown;
}

export interface UserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    approved?: boolean;
    roles: string[];
    image?: string;
    occupation?: UserOccupation[];
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

// Функция для выхода с блокировкой токена на сервере
export const logout = async (): Promise<boolean> => {
    const token = getAuthToken();

    // Очищаем данные на клиенте сразу
    clearAuthData();

    if (!token) {
        console.log('No token to logout');
        return true;
    }

    try {
        // Отправляем запрос на сервер для инвалидации токена
        const response = await fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            // Добавляем сам токен в тело запроса
            body: JSON.stringify({ token })
        });

        console.log('Logout response status:', response.status);

        if (response.ok) {
            console.log('Token successfully invalidated on server');
            return true;
        } else {
            console.warn('Server logout failed, but client data cleared');
            return true; // Все равно возвращаем true, так как на клиенте очищено
        }
    } catch (error) {
        console.error('Error during logout:', error);
        // В случае ошибки сети все равно возвращаем true, так как на клиенте очищено
        return true;
    }
};

// Альтернативная функция для logout (без ожидания ответа от сервера)
export const logoutSync = (): void => {
    const token = getAuthToken();

    // Немедленно очищаем данные на клиенте
    clearAuthData();

    // Асинхронно отправляем запрос на сервер для инвалидации токена
    if (token) {
        fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        })
            .then(response => {
                console.log('Logout async response:', response.status);
            })
            .catch(error => {
                console.error('Async logout error:', error);
            });
    }
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
        return JSON.parse(userDataStr) as UserData;
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

// Интерфейс для JWT Payload
interface JWTPayload {
    exp?: number;
    [key: string]: unknown;
}

// Функция для установки времени истечения токена из JWT (если токен содержит exp)
export const setTokenExpiryFromJWT = (token: string): void => {
    try {
        // JWT токен состоит из трех частей, разделенных точками
        const payload = token.split('.')[1];
        if (!payload) return;

        // Декодируем base64
        const decodedPayload = JSON.parse(atob(payload)) as JWTPayload;

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