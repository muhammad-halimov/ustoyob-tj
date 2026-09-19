import type { Ticket } from '../Ticket';

/**
 * Запись "недавно просмотренные" — GET /api/recently-watched (API_REFERENCE §10).
 * Владелец всегда берётся из Bearer-токена, список отсортирован от новых к старым,
 * хранится максимум 50 последних тикетов на пользователя.
 */
export interface RecentlyWatched {
    id: string | number;
    ticket: Ticket;
    /** ISO datetime последнего просмотра — повторный просмотр только обновляет его. */
    viewedAt: string;
}
