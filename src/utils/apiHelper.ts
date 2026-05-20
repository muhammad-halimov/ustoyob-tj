import { getAuthToken, handleUnauthorized, getUserData } from './auth';
import type { Ticket, SortByType, FavoriteTicketView } from '../entities';
import type { TicketView } from '../entities';
import { formatTicketImageUrl, formatProfileImageUrl } from './imageHelper';
import { API_BASE_URL } from './config';

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

// ─── Адрес тикета ──────────────────────────────────────────────

/** Полный адрес: область, город, район, пригород, поселение, сообщество, деревня, улица */
export const getTicketFullAddress = (ticket: Ticket): string => {
    if (ticket.addresses?.length) {
        const addr = ticket.addresses[0];
        const parts: string[] = [];
        if (addr.province?.title)   parts.push(addr.province.title);
        if (addr.city?.title)       parts.push(addr.city.title);
        if (addr.district?.title)   parts.push(addr.district.title);
        if (addr.suburb?.title)     parts.push(addr.suburb.title);
        if (addr.settlement?.title) parts.push(addr.settlement.title);
        if (addr.community?.title)  parts.push(addr.community.title);
        if (addr.village?.title)    parts.push(addr.village.title);
        if (addr.title)             parts.push(addr.title);
        const unique = Array.from(new Set(parts.filter(Boolean)));
        if (unique.length) return unique.join(', ');
    }
    // Handle case where API returns `address` as a single embedded object (e.g. JSON-LD)
    // instead of a string (common when individual ticket endpoint is called without auth)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAddress = (ticket as any).address;
    if (rawAddress && typeof rawAddress === 'object') {
        const parts: string[] = [];
        if (rawAddress.province?.title)   parts.push(rawAddress.province.title);
        if (rawAddress.city?.title)       parts.push(rawAddress.city.title);
        if (rawAddress.district?.title)   parts.push(rawAddress.district.title);
        if (rawAddress.suburb?.title)     parts.push(rawAddress.suburb.title);
        if (rawAddress.settlement?.title) parts.push(rawAddress.settlement.title);
        if (rawAddress.community?.title)  parts.push(rawAddress.community.title);
        if (rawAddress.village?.title)    parts.push(rawAddress.village.title);
        if (rawAddress.title)             parts.push(rawAddress.title);
        const unique = Array.from(new Set(parts.filter(Boolean)));
        if (unique.length) return unique.join(', ');
    }
    return (typeof ticket.address === 'string' ? ticket.address : '') || 'Адрес не указан';
};

/** Краткий адрес: только город + район */
export const getTicketShortAddress = (ticket: Ticket): string => {
    if (ticket.addresses?.length) {
        const addr = ticket.addresses[0];
        const parts: string[] = [];
        if (addr.city?.title)     parts.push(addr.city.title);
        if (addr.district?.title) parts.push(addr.district.title);
        const unique = Array.from(new Set(parts.filter(Boolean)));
        if (unique.length) return unique.join(', ');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAddress = (ticket as any).address;
    if (rawAddress && typeof rawAddress === 'object') {
        const parts: string[] = [];
        if (rawAddress.city?.title)     parts.push(rawAddress.city.title);
        if (rawAddress.district?.title) parts.push(rawAddress.district.title);
        if (rawAddress.title)           parts.push(rawAddress.title);
        const unique = Array.from(new Set(parts.filter(Boolean)));
        if (unique.length) return unique.join(', ');
    }
    return (typeof ticket.address === 'string' ? ticket.address : '') || 'Адрес не указан';
};

// ─── Маппинг Ticket → TicketView ───────────────────────────

/** Извлекает данные автора тикета (мастер или заказчик) */
export const getTicketAuthor = (ticket: Ticket): { name: string; id: number; imageSrc?: string } => {
    const person = ticket.service ? ticket.master : ticket.author;
    const name = `${person?.surname || ''} ${person?.name || ''}`.trim()
        || (ticket.service ? 'Специалист' : 'Заказчик');
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
        title: ticket.title || 'Без названия',
        price: ticket.budget ?? 0,
        unit: (typeof ticket.unit === 'object' ? ticket.unit?.title : ticket.unit) || 'TJS',
        description: ticket.description || '',
        address: getTicketFullAddress(ticket),
        date: ticket.createdAt ?? '',
        author: author.name,
        authorId: author.id,
        authorImage: author.imageSrc ? formatProfileImageUrl(author.imageSrc) : undefined,
        timeAgo: ticket.createdAt ?? '',
        category: ticket.category?.title || 'другое',
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