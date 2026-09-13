/**
 * Централизованное кеширование данных.
 * createCachedFetcher объединяет universalApiRequest + дедупликацию промисов + TTL-кеш
 * в одну переиспользуемую фабрику — добавить новый ресурс = одна строка.
 */

import type { Province, City, Occupation, Category, District } from '../entities';
import type { AppealReason } from '../entities';
import type { Unit } from '../entities';
import type { LegalDocument } from '../entities';
import { universalApiRequest } from './apiUtils';
import type { LocaleType } from './apiUtils';
import { getStorageItem, getDefaultLocale } from './storageUtils';
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

const toArray = <T>(data: unknown): T[] =>
    Array.isArray(data)
        ? (data as T[])
        : data && typeof data === 'object' && 'hydra:member' in (data as object)
            ? ((data as { 'hydra:member': T[] })['hydra:member'])
            : [];

// ─── Фабрика ─────────────────────────────────────────────────────────────────

/**
 * Создаёт локаль-зависимый загрузчик с TTL-кешем и дедупликацией запросов.
 * @param endpoint    API-путь, напр. '/api/cities'
 * @param opts        Дополнительные опции universalApiRequest (кроме locale)
 * @param cacheDuration  TTL кеша в мс; по умолчанию CACHE_DURATION (5 мин)
 */
function createCachedFetcher<T>(
    endpoint: string,
    opts: FetcherOpts = {},
    cacheDuration = CACHE_DURATION,
) {
    const cache    = new Map<string, CacheEntry<T>>();
    const inFlight = new Map<string, Promise<T[]>>();

    async function fetcher(locale?: string, params?: string): Promise<T[]> {
        const targetLocale = opts.locale !== undefined
            ? (opts.locale === false ? 'fixed' : opts.locale)
            : normalizeLocale(locale || getCurrentLocale());

        const cacheKey    = params ? `${targetLocale}:${params}` : targetLocale;
        const fullEndpoint = params
            ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params}`
            : endpoint;

        const cached = cache.get(cacheKey);
        if (cached && cached.locale === targetLocale && Date.now() - cached.timestamp < cacheDuration) {
            return cached.data;
        }

        const existing = inFlight.get(cacheKey);
        if (existing) return existing;

        const promise = (async (): Promise<T[]> => {
            try {
                const apiLocale = opts.locale !== undefined ? opts.locale : (targetLocale as LocaleType);
                const raw = await universalApiRequest(fullEndpoint, { locale: apiLocale, requiresAuth: opts.requiresAuth });
                const items = toArray<T>(raw);
                cache.set(cacheKey, { data: items, locale: targetLocale, timestamp: Date.now() });
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
    return fetcher;
}

/**
 * TTL-кеш + дедупликация для авторизованных "me"-эндпоинтов, отдающих один
 * (не привязанный к locale) объект/коллекцию — напр. `/api/tech-supports/me`.
 * В отличие от createCachedFetcher не разворачивает hydra-коллекцию и не знает
 * про locale — просто помнит последний ответ на `cacheDuration` мс и позволяет
 * принудительно обойти кеш (`force`) после мутации на клиенте.
 */
function createMeCache<T>(endpoint: string, cacheDuration = CACHE_DURATION) {
    let cached: { data: T; timestamp: number } | null = null;
    let inFlight: Promise<T> | null = null;

    async function fetcher(force = false): Promise<T> {
        if (!force && cached && Date.now() - cached.timestamp < cacheDuration) {
            return cached.data;
        }
        if (inFlight) return inFlight;

        inFlight = (async (): Promise<T> => {
            try {
                const data = await universalApiRequest(endpoint) as T;
                cached = { data, timestamp: Date.now() };
                return data;
            } finally {
                inFlight = null;
            }
        })();

        return inFlight;
    }

    fetcher.clearCache = (): void => { cached = null; inFlight = null; };
    return fetcher;
}

// ─── Загрузчики ──────────────────────────────────────────────────────────────

export const getProvinces      = createCachedFetcher<Province>(API_ROUTES.PROVINCES);
export const getCities         = createCachedFetcher<City>(API_ROUTES.CITIES);
export const getOccupations    = createCachedFetcher<Occupation>(`${API_ROUTES.OCCUPATIONS}?itemsPerPage=500`);
export const getCategories     = createCachedFetcher<Category>(API_ROUTES.CATEGORIES,       { requiresAuth: false }, STATIC_CACHE_DURATION);
export const getDistricts      = createCachedFetcher<District>(API_ROUTES.DISTRICTS,        {}, STATIC_CACHE_DURATION);
export const getUnits          = createCachedFetcher<Unit>(API_ROUTES.UNITS,                {}, STATIC_CACHE_DURATION);
export const getAppealReasons  = createCachedFetcher<AppealReason>(API_ROUTES.APPEAL_REASONS);
export const getLegalDocuments = createCachedFetcher<LegalDocument>(API_ROUTES.LEGAL_DOCUMENTS, {}, STATIC_CACHE_DURATION);
/** Own tech-support tickets — short TTL since it's the user's own mutable data (see TechSupport.tsx). */
export const getMyTechSupports = createMeCache<unknown>(API_ROUTES.TECH_SUPPORTS_ME, 60 * 1000);

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
