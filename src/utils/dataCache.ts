/**
 * Централизованное кеширование данных для cities и occupations
 * Предотвращает множественные запросы к одним и тем же эндпоинтам
 */

import type { Province, City } from '../entities';
import type { Occupation } from '../entities';

interface CacheEntry<T> {
    data: T[];
    locale: string;
    timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
import { API_BASE_URL } from './config';

// Кеши для провинций, городов и профессий
let provincesCache: CacheEntry<Province> | null = null;
let citiesCache: CacheEntry<City> | null = null;
let occupationsCache: CacheEntry<Occupation> | null = null;

// Активные промисы для предотвращения дублирующих запросов
let provincesPromise: Promise<Province[]> | null = null;
let citiesPromise: Promise<City[]> | null = null;
let occupationsPromise: Promise<Occupation[]> | null = null;

/**
 * Нормализует локаль в поддерживаемый формат
 */
const normalizeLocale = (locale?: string): string => {
    if (!locale) return 'ru';
    
    const normalized = locale.toLowerCase();
    if (normalized.includes('en') || normalized === 'eng') return 'eng';
    if (normalized.includes('tj') || normalized === 'tg') return 'tj';
    return 'ru'; // по умолчанию русский
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
 * Получает токен авторизации
 */
const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
};

/**
 * Получает текущую локаль из localStorage
 */
const getCurrentLocale = (): string => {
    if (typeof window === 'undefined') return 'ru';
    const stored = localStorage.getItem('i18nextLng');
    return normalizeLocale(stored || undefined);
};

/**
 * Загружает провинции с кешированием
 */
export const getProvinces = async (locale?: string): Promise<Province[]> => {
    const targetLocale = normalizeLocale(locale || getCurrentLocale());

    if (isCacheValid(provincesCache, targetLocale)) {
        return provincesCache!.data;
    }

    if (provincesPromise) {
        return provincesPromise;
    }

    provincesPromise = (async () => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const token = getAuthToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE_URL}/api/provinces?locale=${targetLocale}`, { headers });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const provinces: Province[] = Array.isArray(data) ? data
                : (data['hydra:member'] ? data['hydra:member'] : []);

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

    // Проверяем кеш
    if (isCacheValid(citiesCache, targetLocale)) {
        console.log('Using cached cities for locale:', targetLocale);
        return citiesCache!.data;
    }

    // Если уже есть активный запрос, ждем его
    if (citiesPromise) {
        console.log('Waiting for existing cities request...');
        return citiesPromise;
    }

    console.log('Fetching cities for locale:', targetLocale);

    citiesPromise = (async () => {
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/cities?locale=${targetLocale}`, {
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const cities: City[] = Array.isArray(data) ? data : 
                                   (data['hydra:member'] ? data['hydra:member'] : []);

            // Кешируем результат
            citiesCache = {
                data: cities,
                locale: targetLocale,
                timestamp: Date.now()
            };

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

    // Проверяем кеш
    if (isCacheValid(occupationsCache, targetLocale)) {
        console.log('Using cached occupations for locale:', targetLocale);
        return occupationsCache!.data;
    }

    // Если уже есть активный запрос, ждем его
    if (occupationsPromise) {
        console.log('Waiting for existing occupations request...');
        return occupationsPromise;
    }

    console.log('Fetching occupations for locale:', targetLocale);

    occupationsPromise = (async () => {
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/occupations?locale=${targetLocale}&itemsPerPage=500`, {
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const occupations: Occupation[] = Array.isArray(data) ? data : 
                                             (data['hydra:member'] ? data['hydra:member'] : []);

            // Кешируем результат
            occupationsCache = {
                data: occupations,
                locale: targetLocale,
                timestamp: Date.now()
            };

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
 * Очищает кеш (например, при смене языка)
 */
export const clearCache = (type?: 'provinces' | 'cities' | 'occupations') => {
    if (!type || type === 'provinces') {
        provincesCache = null;
    }
    if (!type || type === 'cities') {
        citiesCache = null;
    }
    if (!type || type === 'occupations') {
        occupationsCache = null;
    }
    console.log('Cache cleared for:', type || 'all');
};

/**
 * Предзагружает данные для текущей локали
 */
export const preloadData = async () => {
    const locale = getCurrentLocale();
    console.log('Preloading data for locale:', locale);
    
    try {
        await Promise.all([
            getProvinces(locale),
            getCities(locale),
            getOccupations(locale)
        ]);
        console.log('Data preloaded successfully');
    } catch (error) {
        console.error('Error preloading data:', error);
    }
};

export type { Province, City, Occupation };