/**
 * Централизованное кеширование данных.
 * createCachedFetcher объединяет universalApiRequest + дедупликацию промисов + TTL-кеш
 * в одну переиспользуемую фабрику — добавить новый ресурс = одна строка.
 */

import type { Province, City, Occupation, Category, District } from '../entities';
import type { AppealReason } from '../entities';
import type { Unit } from '../entities';
import type { LegalDocument } from '../entities';
import { peekApi, rememberApi, universalApiRequest } from './apiUtils';
import { fetchAllPages } from './paginationUtils';
import type { LocaleType } from './apiUtils';
import { getStorageItem, getDefaultLocale, getStorageJSON, setStorageJSON } from './storageUtils';
import { API_ROUTES } from '../app/routers/routes';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T[];
    locale: string;
    timestamp: number;
}

interface FetcherOpts {
    requiresAuth?: boolean;
    locale?: LocaleType | false;
}

// ─── Константы ───────────────────────────────────────────────────────────────

const CACHE_DURATION        = 5  * 60 * 1000; // 5 мин  (динамичные данные)
const STATIC_CACHE_DURATION = 30 * 60 * 1000; // 30 мин (практически не меняются)

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const normalizeLocale = (locale?: string): LocaleType => {
    if (!locale) return 'tj';
    const n = locale.toLowerCase();
    if (n === 'ru') return 'ru';
    if (n.includes('en') || n === 'eng') return 'eng';
    return 'tj';
};

const getCurrentLocale = (): LocaleType =>
    normalizeLocale(getStorageItem('i18nextLng') ?? undefined) || getDefaultLocale();

// ─── Фабрика ─────────────────────────────────────────────────────────────────

/**
 * Создаёт локаль-зависимый загрузчик с TTL-кешем и дедупликацией запросов.
 * @param endpoint    API-путь, напр. '/api/cities'
 * @param opts        Дополнительные опции universalApiRequest (кроме locale)
 * @param cacheDuration  TTL кеша в мс; по умолчанию CACHE_DURATION (5 мин)
 * @param persistKey  Если задан — кеш дублируется в localStorage под этим ключом (+ locale/params).
 *                     Только in-memory Map не переживает сброс JS-контекста в мобильном Capacitor-
 *                     WebView (Android иногда пересоздаёт WebView при переключении вкладок нижней
 *                     навигации — не полная перезагрузка страницы, но модульное состояние теряется
 *                     так же, как при hard reload); localStorage тому не подвержен.
 */
function createCachedFetcher<T>(
    endpoint: string,
    opts: FetcherOpts = {},
    cacheDuration = CACHE_DURATION,
    persistKey?: string,
) {
    const cache    = new Map<string, CacheEntry<T>>();
    const inFlight = new Map<string, Promise<T[]>>();

    const readEntry = (cacheKey: string): CacheEntry<T> | undefined =>
        cache.get(cacheKey) ?? (persistKey ? getStorageJSON<CacheEntry<T>>(`${persistKey}:${cacheKey}`) ?? undefined : undefined);

    const writeEntry = (cacheKey: string, entry: CacheEntry<T>): void => {
        cache.set(cacheKey, entry);
        if (persistKey) setStorageJSON(`${persistKey}:${cacheKey}`, entry);
    };

    async function fetcher(locale?: string, params?: string): Promise<T[]> {
        const targetLocale = opts.locale !== undefined
            ? (opts.locale === false ? 'fixed' : opts.locale)
            : normalizeLocale(locale || getCurrentLocale());

        const cacheKey    = params ? `${targetLocale}:${params}` : targetLocale;
        const fullEndpoint = params
            ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params}`
            : endpoint;

        const cached = readEntry(cacheKey);
        if (cached && cached.locale === targetLocale && Date.now() - cached.timestamp < cacheDuration) {
            cache.set(cacheKey, cached); // прогреть in-memory, если пришло из localStorage
            return cached.data;
        }

        const existing = inFlight.get(cacheKey);
        if (existing) return existing;

        const promise = (async (): Promise<T[]> => {
            try {
                const apiLocale = opts.locale !== undefined ? opts.locale : (targetLocale as LocaleType);
                // Справочник — это ВСЕ записи, а не первая страница (бэкенд: 25 по умолчанию, максимум 50) —
                // см. fetchAllPages. Раньше `/api/categories` отдавал 25 из 32, районы 25 из 30, подкатегории 50 из 124.
                const items = await fetchAllPages<T>(fullEndpoint, { locale: apiLocale, requiresAuth: opts.requiresAuth });
                writeEntry(cacheKey, { data: items, locale: targetLocale, timestamp: Date.now() });
                return items;
            } catch (error) {
                console.error(`[dataCache] Error fetching ${fullEndpoint}:`, error);
                return [];
            } finally {
                inFlight.delete(cacheKey);
            }
        })();

        inFlight.set(cacheKey, promise);
        return promise;
    }

    fetcher.clearCache = (): void => { cache.clear(); inFlight.clear(); };
    // Синхронный аналог peekCachedImage (imageCacheUtils) — отдаёт уже закэшированные данные без
    // await, если они есть и не протухли. Нужен там, где начальный `loading:true` иначе на каждый
    // маунт мелькает спиннером на один кадр, даже когда данные уже лежат в памяти (см. Category.tsx).
    // Как peek, но без учёта TTL — для мгновенного первого показа экрана в мобильной сборке
    // (stale-while-revalidate): свежие данные экран всё равно запрашивает следом.
    fetcher.peekStale = (locale?: string, params?: string): T[] | undefined => {
        const targetLocale = opts.locale !== undefined
            ? (opts.locale === false ? 'fixed' : opts.locale)
            : normalizeLocale(locale || getCurrentLocale());
        const cacheKey = params ? `${targetLocale}:${params}` : targetLocale;
        const cached = readEntry(cacheKey);
        return cached && cached.locale === targetLocale ? cached.data : undefined;
    };
    fetcher.peek = (locale?: string, params?: string): T[] | undefined => {
        const targetLocale = opts.locale !== undefined
            ? (opts.locale === false ? 'fixed' : opts.locale)
            : normalizeLocale(locale || getCurrentLocale());
        const cacheKey = params ? `${targetLocale}:${params}` : targetLocale;
        const cached = readEntry(cacheKey);
        if (cached && cached.locale === targetLocale && Date.now() - cached.timestamp < cacheDuration) {
            cache.set(cacheKey, cached); // прогреть in-memory, если пришло из localStorage
            return cached.data;
        }
        return undefined;
    };
    return fetcher;
}

/**
 * TTL-кеш + дедупликация для авторизованных "me"-эндпоинтов, отдающих один
 * (не привязанный к locale) объект/коллекцию — напр. `/api/tech-supports/me`.
 * В отличие от createCachedFetcher не разворачивает hydra-коллекцию и не знает
 * про locale — просто помнит последний ответ на `cacheDuration` мс и позволяет
 * принудительно обойти кеш (`force`) после мутации на клиенте.
 */
function createMeCache<T>(endpoint: string, cacheDuration = CACHE_DURATION, paged = false) {
    let cached: { data: T; timestamp: number } | null = null;
    let inFlight: Promise<T> | null = null;

    async function fetcher(force = false): Promise<T> {
        if (!force && cached && Date.now() - cached.timestamp < cacheDuration) {
            return cached.data;
        }
        if (inFlight) return inFlight;

        inFlight = (async (): Promise<T> => {
            try {
                // paged — коллекция (например, свои обращения в ТП): нужны ВСЕ страницы, а не первые 25.
                const data = (paged ? await fetchAllPages(endpoint) : await universalApiRequest(endpoint)) as T;
                cached = { data, timestamp: Date.now() };
                // Мобильная сборка: весь собранный список — в кэш API (переживает перезапуск), см. peek.
                rememberApi(`${endpoint}?__all=1`, {}, data);
                return data;
            } finally {
                inFlight = null;
            }
        })();

        return inFlight;
    }

    fetcher.clearCache = (): void => { cached = null; inFlight = null; };
    /** Последние данные синхронно (память, в мобильной сборке — и сохранённые до перезапуска), без сети. */
    fetcher.peek = (): T | undefined => cached?.data ?? peekApi<T>(`${endpoint}?__all=1`);
    return fetcher;
}

// ─── Загрузчики ──────────────────────────────────────────────────────────────

export const getProvinces      = createCachedFetcher<Province>(API_ROUTES.PROVINCES, {}, undefined, 'dataCache:provinces');
export const getCities         = createCachedFetcher<City>(API_ROUTES.CITIES, {}, undefined, 'dataCache:cities');
export const getOccupations    = createCachedFetcher<Occupation>(API_ROUTES.OCCUPATIONS, {}, undefined, 'dataCache:occupations');
export const getCategories     = createCachedFetcher<Category>(API_ROUTES.CATEGORIES,       { requiresAuth: false }, STATIC_CACHE_DURATION, 'dataCache:categories');
export const getDistricts      = createCachedFetcher<District>(API_ROUTES.DISTRICTS,        {}, STATIC_CACHE_DURATION, 'dataCache:districts');
export const getUnits          = createCachedFetcher<Unit>(API_ROUTES.UNITS,                {}, STATIC_CACHE_DURATION);
export const getAppealReasons  = createCachedFetcher<AppealReason>(API_ROUTES.APPEAL_REASONS, {}, undefined, 'dataCache:appealReasons');
export const getLegalDocuments = createCachedFetcher<LegalDocument>(API_ROUTES.LEGAL_DOCUMENTS, {}, STATIC_CACHE_DURATION);
/** Own tech-support tickets — short TTL since it's the user's own mutable data (see TechSupport.tsx). */
export const getMyTechSupports = createMeCache<unknown>(API_ROUTES.TECH_SUPPORTS_ME, 60 * 1000, true);

// ─── Управление кешем ────────────────────────────────────────────────────────

export const clearCache = (type?: 'provinces' | 'cities' | 'occupations' | 'categories' | 'districts' | 'units' | 'appealReasons' | 'legalDocuments' | 'myTechSupports'): void => {
    if (!type || type === 'provinces')    getProvinces.clearCache();
    if (!type || type === 'cities')       getCities.clearCache();
    if (!type || type === 'occupations')  getOccupations.clearCache();
    if (!type || type === 'categories')   getCategories.clearCache();
    if (!type || type === 'districts')    getDistricts.clearCache();
    if (!type || type === 'units')        getUnits.clearCache();
    if (!type || type === 'appealReasons') getAppealReasons.clearCache();
    if (!type || type === 'legalDocuments') getLegalDocuments.clearCache();
    if (!type || type === 'myTechSupports') getMyTechSupports.clearCache();
};

export const preloadData = async (): Promise<void> => {
    const locale = getCurrentLocale();
    try {
        await Promise.all([getProvinces(locale), getCities(locale), getOccupations(locale)]);
    } catch (error) {
        console.error('[dataCache] Error preloading data:', error);
    }
};

export type { Province, City, Occupation, Category, District, Unit, AppealReason, LegalDocument };
