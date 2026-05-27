/**
 * Централизованное кеширование данных.
 * createCachedFetcher объединяет universalApiRequest + дедупликацию промисов + TTL-кеш
 * в одну переиспользуемую фабрику — добавить новый ресурс = одна строка.
 */

import type { Province, City, Occupation, Category, District } from '../entities';
import type { Unit } from '../entities/api/Ticket';
import { universalApiRequest } from './apiUtils';
import type { LocaleType } from './apiUtils';
import { getStorageItem, getDefaultLocale } from './storageUtils';

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
    let cache: CacheEntry<T> | null = null;
    let inFlight: Promise<T[]> | null = null;

    async function fetcher(locale?: string): Promise<T[]> {
        const targetLocale = opts.locale !== undefined
            ? (opts.locale === false ? 'fixed' : opts.locale)
            : normalizeLocale(locale || getCurrentLocale());

        if (cache && cache.locale === targetLocale && Date.now() - cache.timestamp < cacheDuration) {
            return cache.data;
        }

        if (inFlight) return inFlight;

        inFlight = (async (): Promise<T[]> => {
            try {
                const apiLocale = opts.locale !== undefined ? opts.locale : (targetLocale as LocaleType);
                const raw = await universalApiRequest(endpoint, { locale: apiLocale, requiresAuth: opts.requiresAuth });
                const items = toArray<T>(raw);
                cache = { data: items, locale: targetLocale, timestamp: Date.now() };
                return items;
            } catch (error) {
                console.error(`[dataCache] Error fetching ${endpoint}:`, error);
                return [];
            } finally {
                inFlight = null;
            }
        })();

        return inFlight;
    }

    fetcher.clearCache = (): void => { cache = null; };
    return fetcher;
}

// ─── Загрузчики ──────────────────────────────────────────────────────────────

export const getProvinces   = createCachedFetcher<Province>('/api/provinces');
export const getCities      = createCachedFetcher<City>('/api/cities');
export const getOccupations = createCachedFetcher<Occupation>('/api/occupations?itemsPerPage=500');
export const getCategories  = createCachedFetcher<Category>('/api/categories',  { requiresAuth: false }, STATIC_CACHE_DURATION);
export const getDistricts   = createCachedFetcher<District>('/api/districts',   {}, STATIC_CACHE_DURATION);
export const getUnits       = createCachedFetcher<Unit>('/api/units',           { locale: false }, STATIC_CACHE_DURATION);

// ─── Управление кешем ────────────────────────────────────────────────────────

export const clearCache = (type?: 'provinces' | 'cities' | 'occupations' | 'categories' | 'districts' | 'units'): void => {
    if (!type || type === 'provinces')   getProvinces.clearCache();
    if (!type || type === 'cities')      getCities.clearCache();
    if (!type || type === 'occupations') getOccupations.clearCache();
    if (!type || type === 'categories')  getCategories.clearCache();
    if (!type || type === 'districts')   getDistricts.clearCache();
    if (!type || type === 'units')       getUnits.clearCache();
};

export const preloadData = async (): Promise<void> => {
    const locale = getCurrentLocale();
    try {
        await Promise.all([getProvinces(locale), getCities(locale), getOccupations(locale)]);
    } catch (error) {
        console.error('[dataCache] Error preloading data:', error);
    }
};

export type { Province, City, Occupation, Category, District, Unit };
