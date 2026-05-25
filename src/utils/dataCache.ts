/**
 * Централизованное кеширование данных для cities и occupations
 * Предотвращает множественные запросы к одним и тем же эндпоинтам
 */

import type { Province, City, Occupation } from '../entities';
import type { Category } from '../entities';
import type { District } from '../entities';
import { universalApiRequest, getDefaultLocale } from './apiHelper';
import type { LocaleType } from './apiHelper';
import { getStorageItem } from './storageHelper';

interface CacheEntry<T> {
    data: T[];
    locale: string;
    timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const STATIC_CACHE_DURATION = 30 * 60 * 1000; // 30 минут (для редко меняющихся данных)

// Кеши для провинций, городов и профессий
let provincesCache: CacheEntry<Province> | null = null;
let citiesCache: CacheEntry<City> | null = null;
let occupationsCache: CacheEntry<Occupation> | null = null;
let categoriesCache: CacheEntry<Category> | null = null;
let districtsCache: CacheEntry<District> | null = null;

// Активные промисы для предотвращения дублирующих запросов
let provincesPromise: Promise<Province[]> | null = null;
let citiesPromise: Promise<City[]> | null = null;
let occupationsPromise: Promise<Occupation[]> | null = null;
let categoriesPromise: Promise<Category[]> | null = null;
let districtsPromise: Promise<District[]> | null = null;

/**
 * Нормализует локаль в поддерживаемый формат
 */
const normalizeLocale = (locale?: string): LocaleType => {
    if (!locale) return 'tj';
    const normalized = locale.toLowerCase();
    if (normalized === 'ru') return 'ru';
    if (normalized.includes('en') || normalized === 'eng') return 'eng';
    return 'tj';
};

/**
 * Проверяет актуальность кеша
 */
const isCacheValid = <T>(cache: CacheEntry<T> | null, locale: string): boolean => {
    if (!cache) return false;
    if (cache.locale !== locale) return false;
    return (Date.now() - cache.timestamp) < CACHE_DURATION;
};

/**
 * Получает текущую локаль из localStorage
 */
const getCurrentLocale = (): LocaleType =>
    normalizeLocale(getStorageItem('i18nextLng') ?? undefined) || getDefaultLocale();

/** Извлекает массив из Hydra-ответа или массива */
const toArray = <T>(data: unknown): T[] =>
    Array.isArray(data) ? (data as T[]) :
    (data && typeof data === 'object' && 'hydra:member' in (data as object)
        ? ((data as any)['hydra:member'] as T[])
        : []);

/**
 * Загружает провинции с кешированием
 */
export const getProvinces = async (locale?: string): Promise<Province[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (isCacheValid(provincesCache, targetLocale)) {
        return provincesCache!.data;
    }

    if (provincesPromise) return provincesPromise;

    provincesPromise = (async () => {
        try {
            const data = await universalApiRequest('/api/provinces', { locale: targetLocale });
            const provinces = toArray<Province>(data);
            provincesCache = { data: provinces, locale: targetLocale, timestamp: Date.now() };
            return provinces;
        } catch (error) {
            console.error('Error fetching provinces:', error);
            return [];
        } finally {
            provincesPromise = null;
        }
    })();

    return provincesPromise;
};

/**
 * Загружает города с кешированием
 */
export const getCities = async (locale?: string): Promise<City[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (isCacheValid(citiesCache, targetLocale)) {
        return citiesCache!.data;
    }

    if (citiesPromise) return citiesPromise;

    citiesPromise = (async () => {
        try {
            const data = await universalApiRequest('/api/cities', { locale: targetLocale });
            const cities = toArray<City>(data);
            citiesCache = { data: cities, locale: targetLocale, timestamp: Date.now() };
            return cities;
        } catch (error) {
            console.error('Error fetching cities:', error);
            return [];
        } finally {
            citiesPromise = null;
        }
    })();

    return citiesPromise;
};

/**
 * Загружает профессии с кешированием
 */
export const getOccupations = async (locale?: string): Promise<Occupation[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (isCacheValid(occupationsCache, targetLocale)) {
        return occupationsCache!.data;
    }

    if (occupationsPromise) return occupationsPromise;

    occupationsPromise = (async () => {
        try {
            const data = await universalApiRequest(`/api/occupations?itemsPerPage=500`, { locale: targetLocale });
            const occupations = toArray<Occupation>(data);
            occupationsCache = { data: occupations, locale: targetLocale, timestamp: Date.now() };
            return occupations;
        } catch (error) {
            console.error('Error fetching occupations:', error);
            return [];
        } finally {
            occupationsPromise = null;
        }
    })();

    return occupationsPromise;
};

/**
 * Загружает категории с кешированием (TTL 30 мин — данные очень редко меняются)
 */
export const getCategories = async (locale?: string): Promise<Category[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (categoriesCache && categoriesCache.locale === targetLocale &&
        (Date.now() - categoriesCache.timestamp) < STATIC_CACHE_DURATION) {
        return categoriesCache.data;
    }

    if (categoriesPromise) return categoriesPromise;

    categoriesPromise = (async () => {
        try {
            const data = await universalApiRequest('/api/categories', { locale: targetLocale, requiresAuth: false });
            const categories = toArray<Category>(data);
            categoriesCache = { data: categories, locale: targetLocale, timestamp: Date.now() };
            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        } finally {
            categoriesPromise = null;
        }
    })();

    return categoriesPromise;
};

/**
 * Загружает районы с кешированием (TTL 30 мин)
 */
export const getDistricts = async (locale?: string): Promise<District[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (districtsCache && districtsCache.locale === targetLocale &&
        (Date.now() - districtsCache.timestamp) < STATIC_CACHE_DURATION) {
        return districtsCache.data;
    }

    if (districtsPromise) return districtsPromise;

    districtsPromise = (async () => {
        try {
            const data = await universalApiRequest('/api/districts', { locale: targetLocale });
            const districts = toArray<District>(data);
            districtsCache = { data: districts, locale: targetLocale, timestamp: Date.now() };
            return districts;
        } catch (error) {
            console.error('Error fetching districts:', error);
            return [];
        } finally {
            districtsPromise = null;
        }
    })();

    return districtsPromise;
};

/**
 * Очищает кеш (например, при смене языка)
 */
export const clearCache = (type?: 'provinces' | 'cities' | 'occupations' | 'categories' | 'districts') => {
    if (!type || type === 'provinces') provincesCache = null;
    if (!type || type === 'cities') citiesCache = null;
    if (!type || type === 'occupations') occupationsCache = null;
    if (!type || type === 'categories') categoriesCache = null;
    if (!type || type === 'districts') districtsCache = null;
};

/**
 * Предзагружает данные для текущей локали
 */
export const preloadData = async () => {
    const locale = getCurrentLocale();
    try {
        await Promise.all([
            getProvinces(locale),
            getCities(locale),
            getOccupations(locale),
        ]);
    } catch (error) {
        console.error('Error preloading data:', error);
    }
};

export type { Province, City, Occupation, Category, District };