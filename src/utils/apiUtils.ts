import { getAuthToken, handleUnauthorized, waitForTokenRefresh } from './authUtils';
import { ApiError } from './appMessagesUtils';
import { getDefaultLocale } from './storageUtils';
import i18n from 'i18next';
import type { Ticket, SortByType, FavoriteTicketView, ResolvedImage } from '../entities';
import type { TicketView } from '../entities';
import { formatTicketImageUrl, toPhotoSource, resolveAvatar } from './imageUtils';
import { API_BASE_URL } from './configUtils';
import { apiCacheKey, peekByKey, sameResponse, seedMemoryByKey, storeByKey } from './apiCache';
import { API_ROUTES } from '../app/routers/routes';
import { NATIVE_HTTP, nativeFetch } from './nativeHttp';

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
    /** Lets the caller cancel an in-flight request (e.g. on unmount or logout) via AbortController. */
    signal?: AbortSignal;
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
 * - Returns the parsed JSON body, or `null` for empty responses (204 / Empty body).
 */
/** Итоговый URL запроса (база + ?locale=) — общий для самого запроса и для ключа кэша. */
const buildRequestUrl = (endpoint: string, options: ApiRequestOptions): string => {
    const locale = options.locale !== false ? (options.locale ?? getDefaultLocale()) : null;
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    if (locale) url = appendLocale(url, locale);
    return url;
};

const isCacheableGet = (options: ApiRequestOptions): boolean =>
    (options.method ?? 'GET').toUpperCase() === 'GET' && !options.body;

// Не кэшируем: токены (Mercure-подписки, refresh — секреты, и устаревший токен бесполезен) и
// справочники — у них свой кэш в dataCacheUtils, дублировать их сюда — лишние сотни КБ.
const NOT_CACHED = [
    /token/i,
    /\/subscribe(\?|$)/,
    new RegExp(`^(${[API_ROUTES.PROVINCES, API_ROUTES.CITIES, API_ROUTES.DISTRICTS, API_ROUTES.OCCUPATIONS, API_ROUTES.CATEGORIES, API_ROUTES.UNITS].join('|')})(\\?|$)`),
];
const isCacheableEndpoint = (endpoint: string): boolean => !NOT_CACHED.some(re => re.test(endpoint));

// Мобильная сборка: в ответ на эти запросы бэкенд ставит refresh-cookie — они уходят нативно, иначе
// WebView её не сохранит (см. utils/nativeHttp.ts).
const SETS_REFRESH_COOKIE = new RegExp(`^(${API_ROUTES.AUTHENTICATION_TOKEN}|/api/auth/[^/?]+/callback)(\\?|$)`);

/**
 * Тикет в списке (лента, категория, мои, избранное, недавно просмотренные) отдаётся в том же виде,
 * что и GET /tickets/{id} (сверено) — кладём каждый под ключ его собственного запроса, и страница
 * тикета, открытая из списка, показывается сразу, без лоадера (её свежий запрос всё равно уходит).
 * Только память, без localStorage: это подсказка, а не основной кэш.
 */
const seedTicketsFromList = (endpoint: string, options: ApiRequestOptions, data: unknown, token: string | null): void => {
    if (options.locale !== undefined && options.locale !== getDefaultLocale()) return;
    const path = endpoint.split('?')[0];
    if (/^\/api\/tickets\/[^/]+$/.test(path) && path !== API_ROUTES.TICKETS_ME) {
        // одиночный тикет, не список — только его автор/мастер
        if (data && typeof data === 'object' && !Array.isArray(data)) seedUsersFromTicket(data, token);
        return;
    }
    const items = Array.isArray(data)
        ? data
        : (data as { 'hydra:member'?: unknown[] } | null)?.['hydra:member'];
    if (!Array.isArray(items) || items.length === 0) return;
    // Свои обращения в ТП — так же: GET /tech-supports/{id} отдаёт ту же структуру (сверено), и
    // обращение из списка открывается без лоадера.
    if (path === API_ROUTES.TECH_SUPPORTS_ME) {
        for (const item of items) {
            const ts = item as { id?: unknown; status?: unknown; messages?: unknown } | null;
            if (!ts || typeof ts !== 'object' || ts.id == null || !('status' in ts) || !('messages' in ts)) continue;
            seedMemoryByKey(apiCacheKey(buildRequestUrl(API_ROUTES.TECH_SUPPORT_BY_ID(String(ts.id)), {}), token), ts);
        }
        return;
    }
    for (const item of items) {
        const ticket = (item && typeof item === 'object' && 'ticket' in item ? (item as { ticket?: unknown }).ticket : item) as
            { id?: unknown; title?: unknown; category?: unknown } | null | undefined;
        if (!ticket || typeof ticket !== 'object' || ticket.id == null || !('title' in ticket) || !('category' in ticket)) continue;
        seedMemoryByKey(apiCacheKey(buildRequestUrl(API_ROUTES.TICKET_BY_ID(String(ticket.id)), {}), token), ticket);
        seedUsersFromTicket(ticket, token);
    }
};

/**
 * Автор/мастер, встроенные в тикет, — почти та же структура, что у GET /users/{id} (сверено: там
 * лишь добавлены isOnline/patronymic) — чужой профиль, открытый из ленты/тикета, показывается сразу.
 * Не перезаписываем уже полученный полный ответ.
 */
const seedUsersFromTicket = (ticket: object, token: string | null): void => {
    for (const field of ['author', 'master'] as const) {
        const user = (ticket as Record<string, unknown>)[field] as { id?: unknown; roles?: unknown } | null | undefined;
        if (!user || typeof user !== 'object' || user.id == null || !('roles' in user)) continue;
        const key = apiCacheKey(buildRequestUrl(API_ROUTES.USER_BY_ID(String(user.id)), {}), token);
        if (peekByKey(key) === undefined) seedMemoryByKey(key, user);
    }
};

/**
 * Последний успешный ответ на этот GET — синхронно, без сети (только мобильная сборка, см.
 * utils/apiCache.ts). `undefined`, если такого запроса ещё не было. Параметры те же, что у
 * universalApiRequest, чтобы ключ совпал.
 */
export const peekApi = <T = any>(endpoint: string, options: ApiRequestOptions = {}): T | undefined => {
    if (!isCacheableGet(options)) return undefined;
    const token = options.requiresAuth !== false ? getAuthToken() : null;
    const url = buildRequestUrl(endpoint, options);
    const own = peekByKey(apiCacheKey(url, token));
    if (own !== undefined || !token) return own as T | undefined;
    // Сразу после входа своего кэша ещё нет, а тот же запрос гостем уже был (лента, отзывы, тикет,
    // чужой профиль) — показываем гостевой ответ, пока идёт свой. Личных данных (…/me) у гостя нет.
    return peekByKey(apiCacheKey(url, null)) as T | undefined;
};

/**
 * Мобильная сборка, первый запуск: ответ из встроенного снимка (utils/nativeSnapshot.ts) — только в
 * память и только если своего ещё нет; тикеты и авторы из списка раскладываются так же, как для
 * свежего ответа, чтобы их страницы тоже открывались сразу.
 */
export const seedApi = (endpoint: string, options: ApiRequestOptions, data: unknown): void => {
    if (!isCacheableGet(options)) return;
    const token = options.requiresAuth !== false ? getAuthToken() : null;
    const key = apiCacheKey(buildRequestUrl(endpoint, options), token);
    if (peekByKey(key) !== undefined) return;
    seedMemoryByKey(key, data);
    seedTicketsFromList(endpoint, options, data, token);
};

/**
 * Stale-while-revalidate для одного GET (мобильная сборка; на сайте peek пуст — просто запрос):
 * сохранённый ответ применяется сразу и синхронно (экран/блок — без спиннера), иначе вызывается
 * onMiss (обычно — включить лоадер); затем свежий ответ применяется, только если он отличается.
 */
export const swrGet = async <T = any>(
    endpoint: string,
    options: ApiRequestOptions,
    apply: (data: T) => void | Promise<void>,
    onMiss?: () => void,
    // false — только сеть. Для «Показать ещё» (страница > 1): там apply дописывает к списку, и второе
    // применение (свежий ответ после сохранённого) заменило бы весь список одной страницей.
    useCache = true,
): Promise<void> => {
    const cached = useCache ? peekApi<T>(endpoint, options) : undefined;
    if (cached !== undefined) await apply(cached);
    else onMiss?.();
    const fresh = await universalApiRequest(endpoint, options) as T;
    if (cached === undefined || !sameResponse(cached, fresh)) await apply(fresh);
};

/**
 * Запомнить ответ для GET вручную — для случаев, когда сервер отдаёт «пусто» ошибкой (404 на пустой
 * /me-список), и в кэш сам ответ не попадает. Только мобильная сборка (см. utils/apiCache.ts).
 */
export const rememberApi = (endpoint: string, options: ApiRequestOptions, data: unknown): void => {
    if (!isCacheableGet(options)) return;
    const token = options.requiresAuth !== false ? getAuthToken() : null;
    storeByKey(apiCacheKey(buildRequestUrl(endpoint, options), token), data, JSON.stringify(data));
};

export const universalApiRequest = async (endpoint: string, options: ApiRequestOptions = {}): Promise<any> => {

    const executeRequest = async (): Promise<Response> => {
        // Мобильная сборка: пока обновляется токен (например, сразу после запуска с истёкшим JWT),
        // не отправляем запрос со старым — он всё равно вернулся бы 401.
        if (NATIVE_HTTP && options.requiresAuth !== false) await waitForTokenRefresh();
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

        const url = buildRequestUrl(endpoint, options);
        const transport = NATIVE_HTTP && SETS_REFRESH_COOKIE.test(endpoint) && !(options.body instanceof FormData)
            ? nativeFetch
            : fetch;

        return transport(url, {
            method: options.method || 'GET',
            headers,
            body: options.body instanceof FormData
                ? options.body
                : options.body ? JSON.stringify(options.body) : undefined,
            ...(options.keepalive !== undefined && { keepalive: options.keepalive }),
            ...(options.signal && { signal: options.signal }),
        });
    };

    let response = await executeRequest();

    // Если 401 и требуется авторизация, пробуем обновить токен — но только если токен
    // всё ещё есть. Его отсутствие означает, что пользователь уже вышел (logout не
    // отменяет уже отправленные запросы — этот 401 просто "догнал" нас после выхода),
    // и попытка silent-refresh в этом случае гарантированно бесполезна (refresh-cookie
    // тоже инвалидирована logout'ом) — именно она и была тем самым "лишним" запросом
    // на /api/refresh_token, который видно в devtools сразу после выхода.
    if (response.status === 401 && options.requiresAuth !== false && getAuthToken()) {
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
    const data = text ? JSON.parse(text) : null;
    if (text && isCacheableGet(options) && isCacheableEndpoint(endpoint)) {
        const token = options.requiresAuth !== false ? getAuthToken() : null;
        storeByKey(apiCacheKey(buildRequestUrl(endpoint, options), token), data, text);
        seedTicketsFromList(endpoint, options, data, token);
    }
    return data;
};

/**
 * Parses the response body (if JSON) to extract the `code` field and throws
 * an ApiError.  Falls back to a generic error when the body cannot be parsed.
 *
 * Two backend error shapes are in play: most app errors go through AppMessages
 * and carry `{ code, message }`; anything thrown as a raw Symfony HttpException
 * (e.g. every OAuth service — see InstagramOAuthService::exchangeCodeForTokens)
 * gets serialised by API Platform as RFC7807 problem+json — `{ title, detail,
 * status, type }`, no `code`/`message` at all. Without the `detail` fallback
 * below, that second shape silently degrades to "400 Bad Request".
 */
const throwApiError = async (response: Response): Promise<never> => {
    let code = 'unknown_error';
    let message = `${response.status} ${response.statusText}`;
    try {
        const body = await response.clone().json();
        if (body?.code) code = String(body.code);
        if (body?.message) message = String(body.message);
        else if (body?.detail) message = String(body.detail);
        else if (body?.title) message = String(body.title);
    } catch {
        // body is not JSON — keep defaults
    }
    throw new ApiError(code, message, response.status);
};
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
export const getTicketAuthor = (ticket: Ticket): { name: string; id: string | number; avatar: ResolvedImage | null } => {
    const person = ticket.service ? ticket.master : ticket.author;
    const name = `${person?.surname || ''} ${person?.name || ''}`.trim()
        || (ticket.service ? i18n.t('ticket:specialist') : i18n.t('ticket:customer'));
    return {
        name,
        id: person?.id || 0,
        // Превью 480 px + BlurHash + откат на оригинал (аватар в карточке крошечный).
        avatar: resolveAvatar(person),
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
        authorImage: author.avatar?.src,
        authorAvatar: author.avatar,
        timeAgo: ticket.createdAt ?? '',
        category: ticket.category?.title || i18n.t('ticket:noCategory'),
        subcategory: ticket.subcategory?.title,
        type: ticket.service ? 'master' : 'client',
        active: ticket.active,
        approved: ticket.approved,
        banned: ticket.banned,
        userRating: (ticket.service ? ticket.master?.rating : ticket.author?.rating) || 0,
        userReviewCount: ticket.reviewsCount || 0,
        responsesCount: ticket.responsesCount,
        viewsCount: ticket.viewsCount,
        photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
        photoSources: ticket.images?.map(img => toPhotoSource(img)),
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