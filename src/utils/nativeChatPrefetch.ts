/**
 * Переписки чатов заранее в кэше API — только мобильная (Capacitor) сборка.
 *
 * В ТП список обращений сразу несёт все сообщения, поэтому любое обращение открывается мгновенно.
 * Список чатов отдаёт только последнее сообщение, а переписка — отдельный запрос
 * (GET /chats/{id}/messages). Здесь первая страница переписки верхних чатов списка догружается в
 * фоне, и открытие чата — даже того, куда ещё не заходили, — берёт её из кэша (см. Chat.tsx).
 *
 * Запрашиваем только устаревшее: первой страницы в кэше нет или её самое новое сообщение не
 * совпадает с chat.lastMessage из списка (пришло новое, прочитано, изменено). Запросы по одному;
 * GET сообщений прочитанными их не помечает (сверено с бэкендом, ApiGetChatMessagesController).
 */
import { Capacitor } from '@capacitor/core';
import { API_ROUTES } from '../app/routers/routes';
import { getAuthToken } from './authUtils';
import { parsePagedResponse, peekApi, universalApiRequest, type ApiRequestOptions } from './apiUtils';
import { getPageSize } from './pageSizeUtils';

const ENABLED = Capacitor.isNativePlatform();
const MAX_CHATS = 10;

export const CHAT_MESSAGES_OPTIONS: ApiRequestOptions = { locale: false };

/** Первая (самая новая) страница переписки — тот же URL, что запрашивает Chat.tsx, иначе ключ кэша разойдётся. */
export const chatFirstPageUrl = (chatId: string | number): string =>
    `${API_ROUTES.CHAT_MESSAGES(chatId)}?page=1&itemsPerPage=${getPageSize()}`;

type MessageMark = { id: string | number; readAt?: string | null; updatedAt?: string | null; deletedByAuthor?: boolean };
type ChatLike = { id: string | number; lastMessage?: MessageMark | null };

const mark = (m: MessageMark): string => `${m.id}|${m.readAt ?? ''}|${m.updatedAt ?? ''}|${m.deletedByAuthor ? 1 : 0}`;

const isCachedFresh = (chat: ChatLike & { lastMessage: MessageMark }): boolean => {
    const cached = peekApi(chatFirstPageUrl(chat.id), CHAT_MESSAGES_OPTIONS);
    if (cached === undefined) return false;
    const newest = parsePagedResponse<MessageMark>(cached, 1, getPageSize()).items[0];
    return !!newest && mark(newest) === mark(chat.lastMessage);
};

let running = false;
let queued: { chats: ChatLike[]; skipId: string | number | null } | null = null;

/**
 * Поставить в фон догрузку переписок для чатов из свежего списка. Новый вызов во время прохода
 * заменяет очередь — проход продолжит уже по свежему списку. `skipId` — открытый сейчас чат: его
 * переписку и так запрашивает экран.
 */
export function prefetchChatMessages(chats: ChatLike[], skipId: string | number | null = null): void {
    if (!ENABLED || !getAuthToken()) return;
    queued = { chats: chats.slice(0, MAX_CHATS), skipId };
    if (running) return;
    running = true;
    void (async () => {
        try {
            while (queued) {
                const { chats: list, skipId: skip } = queued;
                queued = null;
                for (const chat of list) {
                    if (queued || !getAuthToken()) break;
                    const last = chat.lastMessage;
                    // Пустой чат (последнего сообщения нет) Chat.tsx и так открывает сразу.
                    if (!last || chat.id === skip || isCachedFresh({ ...chat, lastMessage: last })) continue;
                    try {
                        await universalApiRequest(chatFirstPageUrl(chat.id), CHAT_MESSAGES_OPTIONS);
                    } catch { /* не вышло — откроется с лоадером, как раньше */ }
                }
            }
        } finally {
            running = false;
        }
    })();
}
