import { universalApiRequest } from './apiUtils';
import { getAuthToken } from './authUtils';
import { getStorageJSON, setStorageJSON, removeStorageItem } from './storageUtils';
import { API_ROUTES } from '../app/routers/routes';
import type { HydraResponse, RecentlyWatched, Ticket } from '../entities';

/**
 * "Недавно просмотренные". Два источника, один интерфейс:
 *  - залогиненный — сервер: GET/POST /api/recently-watched (владелец из Bearer, максимум 50);
 *  - гость — localStorage: список id тикетов (новые первыми, те же 50), сами тикеты подтягиваются
 *    по id обычным публичным GET /api/tickets/{id}.
 * При первом заходе под аккаунтом локальная история гостя переносится на сервер (см.
 * `syncGuestHistoryToServer`), чтобы не потеряться после входа.
 */

const GUEST_KEY = 'recentlyWatchedGuest';
const HISTORY_LIMIT = 50; // как на бэке
const SYNC_LIMIT = 10;    // сколько последних гостевых просмотров переносим при входе

type TicketId = string | number;

const getGuestIds = (): TicketId[] => {
    const raw = getStorageJSON<TicketId[]>(GUEST_KEY);
    return Array.isArray(raw) ? raw.filter(id => id != null && id !== '') : [];
};

const setGuestIds = (ids: TicketId[]): void => {
    if (ids.length === 0) removeStorageItem(GUEST_KEY);
    else setStorageJSON(GUEST_KEY, ids.slice(0, HISTORY_LIMIT));
};

const postToServer = (ticketId: TicketId): Promise<unknown> =>
    universalApiRequest(API_ROUTES.RECENTLY_WATCHED, {
        method: 'POST',
        body: { ticket: API_ROUTES.TICKET_BY_ID(ticketId) },
        locale: false,
    });

/**
 * Отметить тикет просмотренным. Залогиненный — POST на сервер (upsert: повтор лишь поднимает
 * запись наверх, дублей и 409 нет); гость — в localStorage, тоже upsert (перенос в начало).
 * Fire-and-forget: сбой истории не должен ничего ломать на странице тикета.
 */
export const recordRecentlyWatched = (ticketId: TicketId): void => {
    if (getAuthToken()) {
        void postToServer(ticketId).catch(() => { /* не критично */ });
        return;
    }
    const key = String(ticketId);
    setGuestIds([ticketId, ...getGuestIds().filter(id => String(id) !== key)]);
};

/**
 * GET /api/recently-watched — новые первыми. Пустой список бэк отдаёт как 404
 * resource_not_found (как /chats/me), а не 200 + [] — это "просмотров ещё нет", не ошибка.
 */
const fetchServerHistory = async (itemsPerPage: number): Promise<Ticket[]> => {
    try {
        const data = await universalApiRequest(`${API_ROUTES.RECENTLY_WATCHED}?page=1&itemsPerPage=${itemsPerPage}`);
        const items: RecentlyWatched[] = Array.isArray(data)
            ? data
            : (data as HydraResponse<RecentlyWatched> | null)?.['hydra:member'] ?? [];
        return items.map(item => item.ticket).filter(Boolean);
    } catch (e: any) {
        if (e?.http === 404 || e?.status === 404) return [];
        throw e;
    }
};

/** Гостевая история → сервер (после входа). От старых к новым, чтобы порядок сохранился: последний
 *  отправленный окажется наверху. Локальный список чистим в любом случае — он больше не гостевой. */
const syncGuestHistoryToServer = async (): Promise<void> => {
    const ids = getGuestIds().slice(0, SYNC_LIMIT).reverse();
    removeStorageItem(GUEST_KEY);
    for (const id of ids) {
        try { await postToServer(id); } catch { /* тикет мог исчезнуть — пропускаем */ }
    }
};

/** Гость: тикеты по сохранённым id. Удалённые/скрытые (404/403) молча выбрасываем и чистим из хранилища. */
const fetchGuestHistory = async (limit: number): Promise<Ticket[]> => {
    const ids = getGuestIds().slice(0, limit);
    const results = await Promise.allSettled(
        ids.map(id => universalApiRequest(API_ROUTES.TICKET_BY_ID(id), { requiresAuth: false }) as Promise<Ticket>),
    );
    const tickets: Ticket[] = [];
    const dead = new Set<string>();
    results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.id) tickets.push(res.value);
        else if (res.status === 'rejected') {
            const status = (res.reason as any)?.http ?? (res.reason as any)?.status;
            if (status === 404 || status === 403) dead.add(String(ids[i]));
        }
    });
    if (dead.size > 0) setGuestIds(getGuestIds().filter(id => !dead.has(String(id))));
    return tickets;
};

/** История просмотров для блока на главной — тикеты, новые первыми (сервер или localStorage). */
export const getRecentlyWatchedTickets = async (limit = 10): Promise<Ticket[]> => {
    if (getAuthToken()) {
        if (getGuestIds().length > 0) await syncGuestHistoryToServer();
        return fetchServerHistory(limit);
    }
    return fetchGuestHistory(limit);
};
