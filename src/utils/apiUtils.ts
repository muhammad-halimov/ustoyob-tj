import { getAuthToken, handleUnauthorized, getUserData } from './authUtils';
import { ApiError } from './appMessagesUtils';
import { getDefaultLocale } from './storageUtils';
import i18n from 'i18next';
import type { Ticket, SortByType, FavoriteTicketView } from '../entities';
import type { TicketView } from '../entities';
import { formatTicketImageUrl, formatProfileImageUrl } from './imageUtils';
import { API_BASE_URL } from './configUtils';

export type LocaleType = 'tj' | 'ru' | 'eng';

export interface ApiRequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
    /**
     * Locale appended as ?locale=xxx to every request.
     * Pass `false` to suppress the param (e.g. auth/chat endpoints that don't support it).
     * Defaults to the stored i18nextLng value, falling back to 'tj'.
     */
    locale?: LocaleType | false;
    /** Pass `true` to send the request with keepalive (e.g. offline/unload beacons). */
    keepalive?: boolean;
}

/** Appends ?locale=xxx to a URL only when not already present. */
const appendLocale = (url: string, locale: LocaleType): string => {
    if (url.includes('locale=')) return url;
    return url + (url.includes('?') ? '&' : '?') + `locale=${locale}`;
};

/**
 * Central HTTP wrapper for all API calls.
 *
 * - Automatically appends `?locale=` from storage (suppress with `locale: false`).
 * - Attaches `Authorization: Bearer <token>` when a token is present (and `requiresAuth !== false`).
 * - On HTTP 401 it tries to refresh the token once and retries the original request.
 *   If refresh fails it throws, leaving the caller to handle the error.
 * - Throws on any non-2xx response.
 * - Returns the parsed JSON body, or `null` for empty responses (204 / no body).
 */
export const universalApiRequest = async (endpoint: string, options: ApiRequestOptions = {}): Promise<any> => {
    const locale = options.locale !== false ? (options.locale ?? getDefaultLocale()) : null;

    const executeRequest = async (): Promise<Response> => {
        const token = getAuthToken();
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            ...options.headers
        };

        if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        if (options.requiresAuth !== false && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        if (locale) url = appendLocale(url, locale);

        return fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body instanceof FormData
                ? options.body
                : options.body ? JSON.stringify(options.body) : undefined,
            ...(options.keepalive !== undefined && { keepalive: options.keepalive }),
        });
    };

    let response = await executeRequest();

    // Если 401 и требуется авторизация, пробуем обновить токен
    if (response.status === 401 && options.requiresAuth !== false) {
        const refreshed = await handleUnauthorized();
        if (refreshed) {
            response = await executeRequest();
        } else {
            await throwApiError(response);
        }
    }

    if (!response.ok) {
        await throwApiError(response);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

/**
 * Parses the response body (if JSON) to extract the `code` field and throws
 * an ApiError.  Falls back to a generic error when the body cannot be parsed.
 */
const throwApiError = async (response: Response): Promise<never> => {
    let code = 'unknown_error';
    let message = `${response.status} ${response.statusText}`;
    try {
        const body = await response.clone().json();
        if (body?.code) code = String(body.code);
        if (body?.message) message = String(body.message);
    } catch {
        // body is not JSON — keep defaults
    }
    throw new ApiError(code, message, response.status);
};

/** @deprecated Use universalApiRequest instead */
export const makeApiRequest = universalApiRequest;

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

// ─── Адрес тикета ──────────────────────────────────────────────

const FULL_ADDR_FIELDS = ['province', 'city', 'district', 'suburb', 'settlement', 'community', 'village'] as const;

/** Extracts address part titles from an address object into an array of strings. */
const extractAddrParts = (addr: any, fields: readonly string[]): string[] => {
    const parts: string[] = [];
    for (const f of fields) if (addr[f]?.title) parts.push(addr[f].title);
    if (addr.title) parts.push(addr.title);
    return parts;
};

/** Deduplicates and joins parts into a comma-separated string, or returns '' if empty. */
const joinAddrParts = (parts: string[]): string =>
    Array.from(new Set(parts.filter(Boolean))).join(', ');

/** Полный адрес: область, город, район, пригород, поселение, сообщество, деревня, улица */
export const getTicketFullAddress = (ticket: Ticket): string => {
    if (ticket.addresses?.length) {
        const result = joinAddrParts(extractAddrParts(ticket.addresses[0], FULL_ADDR_FIELDS));
        if (result) return result;
    }
    // Handle case where API returns `address` as a single embedded object (e.g. JSON-LD)
    // instead of a string (common when individual ticket endpoint is called without auth)
    const rawAddress = (ticket as any).address;
    if (rawAddress && typeof rawAddress === 'object') {
        const result = joinAddrParts(extractAddrParts(rawAddress, FULL_ADDR_FIELDS));
        if (result) return result;
    }
    return (typeof ticket.address === 'string' ? ticket.address : '') || i18n.t('ticket:noAddress');
};

/** Краткий адрес: только город + район */
export const getTicketShortAddress = (ticket: Ticket): string => {
    const SHORT_FIELDS = ['city', 'district'];
    if (ticket.addresses?.length) {
        const result = joinAddrParts(extractAddrParts(ticket.addresses[0], SHORT_FIELDS));
        if (result) return result;
    }
    const rawAddress = (ticket as any).address;
    if (rawAddress && typeof rawAddress === 'object') {
        const result = joinAddrParts(extractAddrParts(rawAddress, SHORT_FIELDS));
        if (result) return result;
    }
    return (typeof ticket.address === 'string' ? ticket.address : '') || i18n.t('ticket:noAddress');
};

// ─── Маппинг Ticket → TicketView ───────────────────────────

/** Извлекает данные автора тикета (мастер или заказчик) */
export const getTicketAuthor = (ticket: Ticket): { name: string; id: number; imageSrc?: string } => {
    const person = ticket.service ? ticket.master : ticket.author;
    const name = `${person?.surname || ''} ${person?.name || ''}`.trim()
        || (ticket.service ? i18n.t('ticket:specialist') : i18n.t('ticket:customer'));
    return {
        name,
        id: person?.id || 0,
        imageSrc: person?.image || person?.imageExternalUrl || undefined,
    };
};

/**
 * Единый маппер Ticket (бэк) → TicketView (UI).
 * Используйте spread для добавления page-specific полей:
 *   `{ ...ticketToTicketView(ticket), status: 'В работе', master: masterName }`
 */
export const ticketToTicketView = (ticket: Ticket): TicketView => {
    const author = getTicketAuthor(ticket);
    return {
        id: ticket.id,
        title: ticket.title || i18n.t('ticket:noTitle'),
        price: ticket.budget ?? 0,
        unit: (typeof ticket.unit === 'object' ? ticket.unit?.title : ticket.unit) || 'TJS',
        description: ticket.description || '',
        address: getTicketFullAddress(ticket),
        date: ticket.createdAt ?? '',
        author: author.name,
        authorId: author.id,
        authorImage: author.imageSrc ? formatProfileImageUrl(author.imageSrc) : undefined,
        timeAgo: ticket.createdAt ?? '',
        category: ticket.category?.title || i18n.t('ticket:noCategory'),
        subcategory: ticket.subcategory?.title,
        type: ticket.service ? 'master' : 'client',
        active: ticket.active,
        userRating: (ticket.service ? ticket.master?.rating : ticket.author?.rating) || 0,
        userReviewCount: ticket.reviewsCount || 0,
        responsesCount: ticket.responsesCount,
        viewsCount: ticket.viewsCount,
        photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
        negotiableBudget: ticket.negotiableBudget,
    };
};

/**
 * Sorts a list of favourite tickets client-side according to the chosen sort key.
 * Used on the Favorites page where all data is already loaded.
 *
 * @param tickets  Flat array of favourite ticket view objects
 * @param sort     One of the `SortByType` values (newest, oldest, price-*, reviews-*, rating-*)
 * @returns        New sorted array (original is not mutated)
 */
export function applyFavoriteSort(tickets: FavoriteTicketView[], sort: SortByType): FavoriteTicketView[] {
    return [...tickets].sort((a, b) => {
        switch (sort) {
            case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
            case 'price-asc': return (a.price || 0) - (b.price || 0);
            case 'price-desc': return (b.price || 0) - (a.price || 0);
            case 'reviews-asc': return (a.userReviewCount || 0) - (b.userReviewCount || 0);
            case 'reviews-desc': return (b.userReviewCount || 0) - (a.userReviewCount || 0);
            case 'rating-asc': return (a.userRating || 0) - (b.userRating || 0);
            case 'rating-desc': return (b.userRating || 0) - (a.userRating || 0);
            default: return 0;
        }
    });
}