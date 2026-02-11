// utils/auth.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin.ustoyob.tj';

// Константы для хранения ключей в localStorage
const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    TOKEN_EXPIRY: 'tokenExpiry',
    USER_ROLE: 'userRole',
    USER_DATA: 'userData',
    USER_EMAIL: 'userEmail',
    USER_OCCUPATION: 'userOccupation',
    SELECTED_CITY: 'selectedCity',
} as const;

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

// ============ Утилиты для работы с localStorage ============
const isClientSide = (): boolean => typeof window !== 'undefined';

const getItem = (key: string): string | null => 
    isClientSide() ? localStorage.getItem(key) : null;

const setItem = (key: string, value: string): void => {
    if (isClientSide()) localStorage.setItem(key, value);
};

const removeItem = (key: string): void => {
    if (isClientSide()) localStorage.removeItem(key);
};

const removeItems = (...keys: string[]): void => {
    if (isClientSide()) keys.forEach(key => localStorage.removeItem(key));
};

// ============ Парсинг JSON с обработкой ошибок ============
const parseJSON = <T,>(str: string | null, key: string): T | null => {
    if (!str) return null;
    try {
        return JSON.parse(str) as T;
    } catch (error) {
        console.error(`Error parsing ${key}:`, error);
        return null;
    }
};

const stringifyJSON = (data: unknown): string => JSON.stringify(data);

// ============ Работа с токеном ============
export const getAuthToken = (): string | null => getItem(STORAGE_KEYS.AUTH_TOKEN);

export const setAuthToken = (token: string): void => {
    setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setAuthTokenExpiry();
};

export const removeAuthToken = (): void => {
    removeItems(
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.USER_OCCUPATION,
        STORAGE_KEYS.SELECTED_CITY
    );
};

// ============ Logout ============
const performLogout = async (token: string, wait: boolean = true): Promise<void> => {
    const controller = new AbortController();
    if (!wait) controller.abort();

    try {
        await fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ token }),
            signal: wait ? undefined : controller.signal,
        });
        console.log('Token invalidated on server');
    } catch (error) {
        console.warn('Server logout error (non-critical):', error);
    }
};

export const logout = async (): Promise<boolean> => {
    const token = getAuthToken();
    clearAuthData();
    if (token) {
        await performLogout(token, true);
    }
    return true;
};

export const logoutSync = (): void => {
    const token = getAuthToken();
    clearAuthData();
    if (token) performLogout(token, false);
};

// ============ Работа со сроком истечения токена ============
const createExpiryDate = (expiry?: string): Date => {
    if (expiry) return new Date(expiry);
    const date = new Date();
    date.setHours(date.getHours() + TOKEN_LIFETIME_HOURS);
    return date;
};

export const getAuthTokenExpiry = (): string | null => getItem(STORAGE_KEYS.TOKEN_EXPIRY);

export const setAuthTokenExpiry = (expiry?: string): void => {
    setItem(STORAGE_KEYS.TOKEN_EXPIRY, createExpiryDate(expiry).toISOString());
};

export const removeAuthTokenExpiry = (): void => {
    removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
};

// ============ Проверка состояния токена ============
const checkTokenTime = (compareFunc: (diff: number) => boolean): boolean => {
    const expiry = getAuthTokenExpiry();
    if (!expiry) return true;
    const diff = new Date(expiry).getTime() - Date.now();
    return compareFunc(diff);
};

export const isTokenExpired = (): boolean => checkTokenTime(diff => diff <= 0);

export const isTokenAboutToExpire = (bufferMinutes: number = 5): boolean => 
    checkTokenTime(diff => diff < bufferMinutes * 60 * 1000);

export const isAuthenticated = (): boolean => {
    const token = getAuthToken();
    return token !== null && !isTokenExpired();
};

// ============ Очистка данных ============
export const clearAuthData = (): void => {
    removeItems(
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.USER_OCCUPATION
    );
};

// ============ Работа с ролью пользователя ============
const normalizeRole = (role: string): 'client' | 'master' | null => {
    if (role === 'ROLE_CLIENT' || role === 'client') return 'client';
    if (role === 'ROLE_MASTER' || role === 'master') return 'master';
    return null;
};

const formatRole = (role: 'client' | 'master'): string => 
    role === 'client' ? 'ROLE_CLIENT' : 'ROLE_MASTER';

export const getUserRole = (): 'client' | 'master' | null => {
    const role = getItem(STORAGE_KEYS.USER_ROLE);
    const normalizedRole = role ? normalizeRole(role) : null;

    return normalizedRole;
};

export const setUserRole = (role: 'client' | 'master'): void => {
    const formatted = formatRole(role);
    console.log('💾💾💾 setUserRole - Setting role:', role, '-> Formatted:', formatted);
    console.trace('💾 setUserRole CALL STACK');
    setItem(STORAGE_KEYS.USER_ROLE, formatted);
};

export const hasRole = (role: 'client' | 'master' | string): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    const normalizedRole = normalizeRole(role as string);
    return userRole === normalizedRole;
};

// ============ Работа с данными пользователя ============
export const getUserData = (): UserData | null => {
    return parseJSON<UserData>(getItem(STORAGE_KEYS.USER_DATA), 'userData');
};

export const setUserData = (data: UserData): void => {
    setItem(STORAGE_KEYS.USER_DATA, stringifyJSON(data));
};

export const updateUserData = (updates: Partial<UserData>): UserData | null => {
    const currentData = getUserData();
    if (!currentData) return null;
    const updatedData = { ...currentData, ...updates };
    setUserData(updatedData);
    return updatedData;
};

// ============ Работа с email пользователя ============
export const getUserEmail = (): string | null => getItem(STORAGE_KEYS.USER_EMAIL);

export const setUserEmail = (email: string): void => {
    setItem(STORAGE_KEYS.USER_EMAIL, email);
};

// ============ Работа с occupation пользователя ============
export const getUserOccupation = (): UserOccupation[] | null => {
    return parseJSON<UserOccupation[]>(getItem(STORAGE_KEYS.USER_OCCUPATION), 'occupation');
};

export const setUserOccupation = (occupation: UserOccupation[]): void => {
    setItem(STORAGE_KEYS.USER_OCCUPATION, stringifyJSON(occupation));
};

export const clearUserOccupation = (): void => {
    removeItem(STORAGE_KEYS.USER_OCCUPATION);
};

// ============ Работа с JWT ============
interface JWTPayload {
    exp?: number;
    [key: string]: unknown;
}

const decodeJWTPayload = (token: string): JWTPayload | null => {
    try {
        const payload = token.split('.')[1];
        return payload ? JSON.parse(atob(payload)) as JWTPayload : null;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
};

export const setTokenExpiryFromJWT = (token: string): void => {
    const payload = decodeJWTPayload(token);
    if (payload?.exp) {
        setAuthTokenExpiry(new Date(payload.exp * 1000).toISOString());
        console.log('Token expiry set from JWT');
    } else {
        setAuthTokenExpiry();
    }
};

// ============ Вспомогательные функции ============
export const getUserFullName = (): string | null => {
    const userData = getUserData();
    const name = userData?.name || '';
    const surname = userData?.surname || '';
    return `${name} ${surname}`.trim() || userData?.email || null;
};

export const isUserApproved = (): boolean => {
    const userData = getUserData();
    return userData?.approved === true;
};

// ============ Обновление токена ============
export const refreshToken = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            credentials: 'include', // Важно для отправки cookies с refresh token
        });

        if (!response.ok) {
            console.error('Token refresh failed:', response.status);
            return false;
        }

        const data = await response.json();
        
        if (data.token) {
            setAuthToken(data.token);
            console.log('Token refreshed successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
};

// ============ Автоматическое обновление токена ============
export const setupTokenRefresh = async (
    onTokenExpired?: () => void
): Promise<void> => {
    if (!isClientSide()) return;

    const checkInterval = setInterval(async () => {
        if (isTokenExpired()) {
            console.log('Token expired, logging out...');
            clearInterval(checkInterval);
            clearAuthData();
            if (onTokenExpired) {
                onTokenExpired();
            } else {
                window.location.href = '/';
            }
            return;
        }

        // Пытаемся обновить токен за 5 минут до истечения
        if (isTokenAboutToExpire(5)) {
            console.log('Token about to expire, attempting refresh...');
            const success = await refreshToken();
            if (!success) {
                console.log('Token refresh failed, logging out...');
                clearInterval(checkInterval);
                clearAuthData();
                if (onTokenExpired) {
                    onTokenExpired();
                } else {
                    window.location.href = '/';
                }
            }
        }
    }, 60000); // Проверяем каждую минуту
};
