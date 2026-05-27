// utils/auth.ts
import {API_BASE_URL} from './configUtils';
import type {Occupation, User} from '../entities';
import {
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    removeStorageItems,
    getStorageJSON,
    setStorageJSON,
    isClientSide,
} from './storageUtils';

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

// Время жизни токена (1 час). Используется при расчёте времени истечения
// если бэкенд не вернул явный expiry в ответе.
const TOKEN_LIFETIME_HOURS = 1;

// ============ Кэш запроса /api/users/me ============
// _mePromise  — хранит текущий незавершённый запрос, чтобы несколько
//              одновременных вызовов fetchCurrentUser не создавали дублей.
// _meCachedAt — timestamp последнего успешного ответа. Кэш актуален
//              пока не истёк ME_CACHE_TTL_MS (30 сек).
let _mePromise: Promise<User | null> | null = null;
let _meCachedAt = 0;
const ME_CACHE_TTL_MS = 30_000 as const;

// Aliases to keep internal code concise
const getItem = getStorageItem;
const setItem = setStorageItem;
const removeItem = removeStorageItem;
const removeItems = removeStorageItems;

// ============ Работа с токеном ============
/** Retrieves the JWT access token from localStorage. Returns null when not logged in. */
export const getAuthToken = (): string | null => getItem(STORAGE_KEYS.AUTH_TOKEN);

/** Persists the JWT token and calculates/stores its expiry time. */
export const setAuthToken = (token: string): void => {
    setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setAuthTokenExpiry();
};

/**
 * Removes the token, expiry, and all user-related localStorage keys.
 * Also resets the /api/users/me cache.
 * NOTE: does NOT call the server logout endpoint — use `logout()` for a full logout.
 */
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
/**
 * Calls /api/invalidate_token then /api/logout on the server.
 * @param wait  When false the second request is aborted immediately (fire-and-forget for page unload).
 */
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

/**
 * Full logout: clears auth data from localStorage first (so the UI updates
 * immediately), then attempts to invalidate the token on the server.
 */
export const logout = async (): Promise<boolean> => {
    const token = getAuthToken();
    clearAuthData();
    if (token) {
        await performLogout(token, true);
    }
    return true;
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

/**
 * Removes token + expiry + all user data keys from localStorage.
 * Unlike `removeAuthToken`, this does NOT remove SELECTED_CITY,
 * so the user's city preference is preserved after logout.
 */
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
/** Normalises any stored role format ('ROLE_CLIENT', 'client', 'ROLE_MASTER', 'master') to a canonical value. */
const normalizeRole = (role: string): 'client' | 'master' | null => {
    if (role === 'ROLE_CLIENT' || role === 'client') return 'client';
    if (role === 'ROLE_MASTER' || role === 'master') return 'master';
    return null;
};

/** Formats a canonical role to the backend format expected by the API (e.g. 'client' → 'ROLE_CLIENT'). */
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

// ============ Работа с данными пользователя ============
export const getUserData = (): User | null => {
    return getStorageJSON<User>(STORAGE_KEYS.USER_DATA);
};

export const setUserData = (data: User): void => {
    setStorageJSON(STORAGE_KEYS.USER_DATA, data);
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

/**
 * Attempts to obtain a new JWT via the httpOnly refresh-token cookie.
 * Returns true on success (new token stored), false otherwise.
 */
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

/**
 * Called automatically by `universalApiRequest` on HTTP 401.
 * Tries to refresh the token; if successful returns true so the
 * caller can retry its request. On failure triggers a full logout
 * and dispatches a global 'logout' event.
 */
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

/**
 * Starts a 60-second polling interval that:
 *   - logs out when the token has already expired;
 *   - attempts a silent refresh 5 minutes before expiry.
 * Call once at application boot (e.g. inside Layout).
 * @param onTokenExpired  Optional callback; if omitted the page redirects to '/'.
 */
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
/** Invalidates the in-memory timestamp so the next fetchCurrentUser call hits the network. */
export const invalidateCurrentUserCache = (): void => {
    _meCachedAt = 0;
};

/**
 * Fetches the current user from /api/users/me with:
 *   - localStorage cache: returns stored data when fresher than ME_CACHE_TTL_MS (30 s).
 *   - In-flight deduplication: concurrent calls share one network request.
 *   - Auto-refresh on 401: retries once after refreshing the token.
 * Returns null when the user is not authenticated.
 */
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
