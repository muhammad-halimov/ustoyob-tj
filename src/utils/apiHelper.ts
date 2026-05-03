import { getAuthToken, handleUnauthorized, getUserData } from './auth';

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

export const getCurrentUserId = (): number | null => getUserData()?.id ?? null;

/**
 * Parses a paged API response into items and a `hasMore` flag.
 *
 * @param rawData       Raw JSON value returned by the API
 * @param page          Current 1-based page number
 * @param pageSize      Number of items per page
 * @param hydraResponse Set to `true` when the endpoint returns a Hydra LD+JSON collection
 *                      (`hydra:member` + `hydra:totalItems`) for exact totals.
 *                      Defaults to `false` — treats response as a plain array.
 * @returns             `{ items, hasMore }` — parsed item array and whether more pages exist
 */
export function parsePagedResponse<T = unknown>(
    rawData: unknown,
    page: number,
    pageSize: number,
    hydraResponse = false,
): { items: T[]; hasMore: boolean } {
    const isHydraShape = (v: unknown): v is { 'hydra:member': unknown[]; 'hydra:totalItems'?: number } =>
        v !== null && typeof v === 'object' && 'hydra:member' in (v as object);

    let items: T[];
    let total: number | null = null;

    if (hydraResponse && isHydraShape(rawData)) {
        items = (rawData['hydra:member'] as T[]) ?? [];
        if (rawData['hydra:totalItems'] != null) total = Number(rawData['hydra:totalItems']);
    } else if (Array.isArray(rawData)) {
        items = rawData as T[];
    } else if (isHydraShape(rawData)) {
        items = (rawData['hydra:member'] as T[]) ?? [];
    } else {
        items = [];
    }

    return { items, hasMore: total != null ? page * pageSize < total : items.length >= pageSize };
}