import { universalApiRequest } from './apiUtils';
import type { ApiRequestOptions } from './apiUtils';

/**
 * Забор ВСЕХ записей коллекции через постраничный API.
 *
 * Бэкенд отдаёт коллекции постранично: по умолчанию 25 записей, максимум 50 (API_REFERENCE.md),
 * а завышенный `itemsPerPage` (например 500) молча режет до 50. Запрос без пагинации поэтому видит
 * только первую страницу — справочники, избранное, чёрный список, список чатов и т.п. теряли всё
 * сверх 25. Используйте это там, где нужен ВЕСЬ набор без постраничного UI; для списков с «Показать
 * ещё» страницы запрашивает сам компонент (parsePagedResponse).
 */

/** Максимум, который бэкенд реально отдаёт за страницу. */
export const SERVER_MAX_PAGE_SIZE = 50;
/** Предохранитель от бесконечного цикла при некорректном totalItems/ответе. */
const DEFAULT_MAX_PAGES = 20;

/** Подставляет `itemsPerPage`/`page` в endpoint, переопределяя уже стоящие (например, старый `itemsPerPage=500`). */
export const withPaging = (endpoint: string, page: number, pageSize = SERVER_MAX_PAGE_SIZE): string => {
    const [path, query = ''] = endpoint.split('?');
    const params = new URLSearchParams(query);
    params.set('itemsPerPage', String(pageSize));
    params.set('page', String(page));
    return `${path}?${params.toString()}`;
};

/** Элементы страницы: голый массив, Hydra (`hydra:member` / `member`) или единичный объект с `id`. */
const extractItems = <T>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        for (const key of ['hydra:member', 'member']) {
            if (Array.isArray(obj[key])) return obj[key] as T[];
        }
        if ('id' in obj) return [obj as T];
    }
    return [];
};

const extractTotal = (data: unknown): number | null => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const obj = data as Record<string, unknown>;
        const n = Number(obj['hydra:totalItems'] ?? obj['totalItems']);
        if (obj['hydra:totalItems'] !== undefined || obj['totalItems'] !== undefined) return Number.isFinite(n) ? n : null;
    }
    return null;
};

export interface FetchAllPagesOptions extends ApiRequestOptions {
    /** Сколько страниц максимум (по 50). По умолчанию 20. */
    maxPages?: number;
}

/**
 * Собирает все страницы `endpoint` в один массив. Пустая коллекция у этого API — 404 `resource_not_found`:
 * на первой странице это «ничего нет» (`[]`), на следующих — просто конец списка. Прочие ошибки
 * пробрасываются как есть.
 */
export async function fetchAllPages<T = unknown>(endpoint: string, options: FetchAllPagesOptions = {}): Promise<T[]> {
    const { maxPages = DEFAULT_MAX_PAGES, ...requestOptions } = options;

    const request = async (page: number): Promise<unknown | null> => {
        try {
            return await universalApiRequest(withPaging(endpoint, page), requestOptions);
        } catch (error) {
            if ((error as { http?: number; status?: number })?.http === 404 || (error as { status?: number })?.status === 404) return null;
            throw error;
        }
    };

    const first = await request(1);
    if (first === null) return [];

    const items = extractItems<T>(first);
    const total = extractTotal(first);

    if (total !== null) {
        // Общее число известно — остальные страницы параллельно.
        if (items.length < total) {
            const pages = Math.min(Math.ceil(total / SERVER_MAX_PAGE_SIZE), maxPages);
            const rest = await Promise.all(Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => request(i + 2)));
            rest.forEach(r => { if (r !== null) items.push(...extractItems<T>(r)); });
        }
    } else if (items.length >= SERVER_MAX_PAGE_SIZE) {
        // Голый массив без totalItems (приложение шлёт Accept: application/json) — идём, пока приходят полные страницы.
        for (let page = 2, last = items.length; last >= SERVER_MAX_PAGE_SIZE && page <= maxPages; page++) {
            const chunk = await request(page);
            if (chunk === null) break;
            const pageItems = extractItems<T>(chunk);
            items.push(...pageItems);
            last = pageItems.length;
        }
    }

    return items;
}
