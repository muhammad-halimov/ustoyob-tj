import { getAuthToken } from './authUtils';
import { universalApiRequest } from './apiUtils';
import { resolveApiError } from './appMessagesUtils';
import type { Chat } from '../entities';
import type { HydraResponse } from '../entities';
import type { User } from '../entities';

/** Stub — previously contained modal initialisation logic that was removed. Kept for backwards-compat imports. */
export const initChatModals = () => {
};

// Извлекает числовой id из объекта: сначала проверяет числовое поле id,
// затем парсит IRI вида "/api/chats/123"
const extractId = (obj: any): number | undefined => {
    if (obj?.id) return typeof obj.id === 'number' ? obj.id : parseInt(String(obj.id));
    const iri = obj?.['@id'];
    if (iri) {
        const match = String(iri).match(/\/(\d+)$/);
        if (match) return parseInt(match[1]);
    }
    return undefined;
};

/**
 * Creates a new chat with the given user (replyAuthor), or returns the
 * existing chat if one already exists between the current user and replyAuthorId.
 *
 * @param replyAuthorId  ID of the user to start a chat with
 * @param ticketId       Optional: link the chat to a specific ticket
 * @throws Error when the target user is inactive or the API call fails
 */
export const createChatWithAuthor = async (replyAuthorId: number, ticketId?: number): Promise<Chat | null> => {
    const token = getAuthToken();
    if (!token) return null;

    const existingChat = await findExistingChat(replyAuthorId);
    if (existingChat) return existingChat;

    const userStatus = await checkUserStatus(replyAuthorId);
    if (!userStatus.approved || !userStatus.active) {
        throw new Error('user_inactive');
    }

    const chatData: { replyAuthor: string; ticket?: string } = {
        replyAuthor: `/api/users/${replyAuthorId}`,
    };
    if (ticketId) chatData.ticket = `/api/tickets/${ticketId}`;

    try {
        const rawResponse = await universalApiRequest('/api/chats', {
            method: 'POST',
            body: chatData,
            locale: false,
        });
        rawResponse.id = extractId(rawResponse);
        invalidateChatsCache();
        return rawResponse as Chat;
    } catch (e: any) {
        throw new Error(resolveApiError(e));
    }
};

/**
 * Checks whether the given user is approved and active before allowing
 * chat creation.  Returns { approved: false, active: false } on any error.
 */
export const checkUserStatus = async (userId: number): Promise<{ approved: boolean; active: boolean }> => {
    try {
        const token = getAuthToken();
        if (!token) return { approved: false, active: false };
        const userData: User = await universalApiRequest(`/api/users/${userId}`, { locale: false });
        return {
            approved: userData.approved !== false,
            active: userData.active !== false,
        };
    } catch {
        return { approved: false, active: false };
    }
};

const CHATS_ME_CACHE_TTL = 15_000; // 15 секунд
let _chatsMeCache: { data: Chat[]; timestamp: number } | null = null;
let _chatsMePromise: Promise<Chat[]> | null = null;

/**
 * Загружает список чатов /api/chats/me с дедупликацией и коротким кешем (15 с).
 * Не использовать для постраничного вывода — только для поиска существующего чата.
 */
export const getChatsMe = async (): Promise<Chat[]> => {
    const now = Date.now();
    if (_chatsMeCache && now - _chatsMeCache.timestamp < CHATS_ME_CACHE_TTL) {
        return _chatsMeCache.data;
    }
    if (_chatsMePromise) return _chatsMePromise;

    _chatsMePromise = universalApiRequest('/api/chats/me', { locale: false }).then((responseData) => {
        let chatsArray: Chat[] = [];
        if (Array.isArray(responseData)) {
            chatsArray = responseData;
        } else if (responseData && typeof responseData === 'object') {
            if ('hydra:member' in responseData && Array.isArray((responseData as HydraResponse<Chat>)['hydra:member'])) {
                chatsArray = (responseData as HydraResponse<Chat>)['hydra:member'];
            } else if ((responseData as Chat).id) {
                chatsArray = [responseData as Chat];
            }
        }
        chatsArray = chatsArray.map(chat => ({ ...chat, id: extractId(chat) ?? chat.id }));
        _chatsMeCache = { data: chatsArray, timestamp: Date.now() };
        _chatsMePromise = null;
        return chatsArray;
    }).catch((err) => {
        _chatsMePromise = null;
        throw err;
    });

    return _chatsMePromise;
};

/**
 * Инвалидирует кеш чатов (вызывать после создания/удаления чата).
 */
export const invalidateChatsCache = (): void => {
    _chatsMeCache = null;
    _chatsMePromise = null;
};

const findExistingChat = async (replyAuthorId: number): Promise<Chat | null> => {
    try {
        const chatsArray = await getChatsMe();
        return chatsArray.find(chat =>
            extractId(chat.replyAuthor) === replyAuthorId ||
            extractId(chat.author) === replyAuthorId
        ) ?? null;
    } catch {
        return null;
    }
};