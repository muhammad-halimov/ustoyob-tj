// utils/auth.ts
import {API_BASE_URL} from './config';
import type {Occupation, User} from '../entities';
import {
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    removeStorageItems,
    getStorageJSON,
    setStorageJSON,
} from './storageHelper';

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

// ============ Кэш запроса /api/users/me ============
let _mePromise: Promise<User | null> | null = null;
let _meCachedAt = 0;
const ME_CACHE_TTL_MS = 30_000 as const;

// Aliases to keep internal code concise
const getItem = getStorageItem;
const setItem = setStorageItem;
const removeItem = removeStorageItem;
const removeItems = removeStorageItems;

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
    _mePromise = null;
    _meCachedAt = 0;
};

// ============ Logout ============
const performLogout = async (token: string, wait: boolean = true): Promise<void> => {
    const controller = new AbortController();
    if (!wait) controller.abort();

    try {
        // Сначала инвалидируем токен
        await fetch(`${API_BASE_URL}/api/invalidate_token`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Затем выполняем logout
        await fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
            signal: wait ? undefined : controller.signal
        });
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
    _mePromise = null;
    _meCachedAt = 0;
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
    return role ? normalizeRole(role) : null;
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
export const getUserData = (): User | null => {
    return getStorageJSON<User>(STORAGE_KEYS.USER_DATA);
};

export const setUserData = (data: User): void => {
    setStorageJSON(STORAGE_KEYS.USER_DATA, data);
};

export const updateUserData = (updates: Partial<User>): User | null => {
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
export const getUserOccupation = (): Occupation[] | null => {
    return getStorageJSON<Occupation[]>(STORAGE_KEYS.USER_OCCUPATION);
};

export const setUserOccupation = (occupation: Occupation[]): void => {
    setStorageJSON(STORAGE_KEYS.USER_OCCUPATION, occupation);
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
    return `${surname} ${name}`.trim() || userData?.email || null;
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
            credentials: 'include',
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

// ============ Обработка 401 ошибки с автоматическим обновлением токена ============
export const handleUnauthorized = async (): Promise<boolean> => {
    console.log('Handling 401 Unauthorized - attempting token refresh...');
    
    const refreshSuccess = await refreshToken();
    
    if (refreshSuccess) {
        console.log('Token refresh successful, can retry request');
        return true;
    }
    
    console.log('Token refresh failed, logging out...');
    await logout();
    window.dispatchEvent(new Event('logout'));
    return false;
};

// ============ Автоматическое обновление токена ============
const isClientSide = (): boolean => typeof window !== 'undefined';

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

// ============ Единый закэшированный запрос /api/users/me ============
export const invalidateCurrentUserCache = (): void => {
    _meCachedAt = 0;
};

export const fetchCurrentUser = async (): Promise<User | null> => {
    const token = getAuthToken();
    if (!token) return null;

    // Return from localStorage if data is fresh enough
    const cached = getUserData();
    if (cached && Date.now() - _meCachedAt < ME_CACHE_TTL_MS) return cached;

    // Deduplicate concurrent in-flight requests
    if (_mePromise) return _mePromise;

    _mePromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                const userData: User = await response.json();
                setUserData(userData);
                _meCachedAt = Date.now();
                return userData;
            }

            if (response.status === 401) {
                const refreshed = await refreshToken();
                if (!refreshed) return null;
                const newToken = getAuthToken();
                if (!newToken) return null;
                const retryResp = await fetch(`${API_BASE_URL}/api/users/me`, {
                    headers: {
                        Authorization: `Bearer ${newToken}`,
                        Accept: 'application/json',
                    },
                });
                if (!retryResp.ok) return null;
                const userData: User = await retryResp.json();
                setUserData(userData);
                _meCachedAt = Date.now();
                return userData;
            }

            return null;
        } catch {
            return null;
        } finally {
            _mePromise = null;
        }
    })();

    return _mePromise;
};
