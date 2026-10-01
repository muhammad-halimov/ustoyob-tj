/**
 * Встроенный в мобильную сборку снимок данных — что в него входит и под какими адресами это
 * запрашивают экраны. Один источник правды и для приложения (utils/nativeSnapshot.ts, главная), и
 * для скрипта сборки (scripts/build-mobile-snapshot.mjs читает этот файл прямо из Node), поэтому
 * здесь только чистые константы и функции — никаких импортов, кроме маршрутов.
 */
import { API_ROUTES } from '../app/routers/routes.ts';

export const SNAPSHOT_LOCALES = ['tj', 'ru', 'eng'] as const;
export type SnapshotLocale = typeof SNAPSHOT_LOCALES[number];

/** Папка снимка внутри сборки (public/ → dist/ → assets приложения). */
export const SNAPSHOT_DIR = 'snapshot';

/**
 * Справочники (dataCacheUtils.createCachedFetcher): имя → эндпоинт. Все страницы целиком, как их
 * собирает сам загрузчик (fetchAllPages), без доп. параметров.
 */
export const SNAPSHOT_FETCHERS = {
    categories: API_ROUTES.CATEGORIES,
    provinces: API_ROUTES.PROVINCES,
    cities: API_ROUTES.CITIES,
    districts: API_ROUTES.DISTRICTS,
    occupations: API_ROUTES.OCCUPATIONS,
} as const;
export type SnapshotFetcherName = keyof typeof SNAPSHOT_FETCHERS;

/** Лента «Свежие объявления» на главной: гостю — все, вошедшему — без его собственных. */
export const HOME_FEED_PAGE_SIZE = 12;
export const homeFeedEndpoint = (excludeUserId?: string | number | null): string => {
    const params = new URLSearchParams({ active: 'true', page: '1', itemsPerPage: String(HOME_FEED_PAGE_SIZE) });
    if (excludeUserId) {
        params.set('author.id[ne]', String(excludeUserId));
        params.set('master.id[ne]', String(excludeUserId));
    }
    return `${API_ROUTES.TICKETS}?${params.toString()}`;
};

/** Отзывы на главной, страница page (размер — как у списков, getPageSize). */
export const homeReviewsEndpoint = (page: number, pageSize: number): string =>
    `${API_ROUTES.REVIEWS}?page=${page}&itemsPerPage=${pageSize}`;

/** Формат файла снимка на одну локаль. */
export interface SnapshotLocaleFile {
    createdAt: string;
    locale: SnapshotLocale;
    /** Справочники: имя загрузчика → все записи. */
    fetchers: Partial<Record<SnapshotFetcherName, unknown[]>>;
    /** GET-ответы гостя: эндпоинт (без базы и locale) → тело ответа. */
    api: Record<string, unknown>;
}

/** Общий файл: иконки категорий, положенные в сборку. URL картинки на сервере → путь в сборке. */
export interface SnapshotIndexFile {
    createdAt: string;
    apiBaseUrl: string;
    images: Record<string, string>;
}
