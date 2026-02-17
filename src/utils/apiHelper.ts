import { getAuthToken, handleUnauthorized } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ApiRequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
}

export const makeApiRequest = async (endpoint: string, options: ApiRequestOptions = {}): Promise<any> => {
    const executeRequest = async (): Promise<Response> => {
        const token = getAuthToken();
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            ...options.headers
        };

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (options.requiresAuth !== false && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

        return fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body instanceof FormData
                ? options.body
                : options.body ? JSON.stringify(options.body) : undefined
        });
    };

    let response = await executeRequest();

    // Если 401 и требуется авторизация, пробуем обновить токен
    if (response.status === 401 && options.requiresAuth !== false) {
        const refreshed = await handleUnauthorized();
        if (refreshed) {
            // Повторяем запрос с новым токеном
            response = await executeRequest();
        } else {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
    }

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

export const getCurrentUserId = async (): Promise<number | null> => {
    try {
        const userData = await makeApiRequest('/api/users/me', { requiresAuth: true });
        return userData.id;
    } catch {
        return null;
    }
};