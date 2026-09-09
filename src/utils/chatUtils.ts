import { getAuthToken } from './authUtils';
import { universalApiRequest } from './apiUtils';
import { resolveApiError } from './appMessagesUtils';
import i18n from 'i18next';
import type { Chat } from '../entities';
import type { HydraResponse } from '../entities';
import type { User } from '../entities';
import { getSessionJSON, setSessionJSON } from './storageUtils';
import { API_ROUTES } from '../app/routers/routes';

const RESPONDED_IDS_KEY = 'respondedTicketIds';

/** Persists a responded ticket ID to sessionStorage so it survives page navigations. */
export const persistRespondedTicketId = (ticketId: string | number): void => {
    const existing = getSessionJSON<(string | number)[]>(RESPONDED_IDS_KEY) ?? [];
    if (!existing.includes(ticketId)) {
        setSessionJSON(RESPONDED_IDS_KEY, [...existing, ticketId]);
    }
};

/** Reads all persisted responded ticket IDs from sessionStorage. */
export const getPersistedRespondedTicketIds = (): Set<string | number> =>
    new Set(getSessionJSON<(string | number)[]>(RESPONDED_IDS_KEY) ?? []);

/** Stub — previously contained modal initialisation logic that was removed. Kept for backwards-compat imports. */
export const initChatModals = () => {
};

// Извлекает id (string или number) из объекта: сначала проверяет поле id,
// затем парсит IRI вида "/api/chats/{id}" (any format — UUID или число)
const extractId = (obj: any): string | number | undefined => {
    if (obj?.id) return obj.id;
    const iri = obj?.['@id'];
    if (iri) {
        const match = String(iri).match(/\/([^/]+)$/);
        if (match) return match[1];
    }
    return undefined;
};

/** Normalizes `chat.ticket` — a bare IRI string, an `{'@id'}`-only object, or already `{id,...}` —
 *  down to always carrying a usable `.id` (UUID or number). Shared by `getChatsMe`/`getChatsWithUser`. */
const normalizeChatTicket = (chat: Chat): Chat => {
    const rawTicket = (chat as any).ticket;
    let ticket: any = rawTicket;
    if (rawTicket) {
        if (typeof rawTicket === 'string') {
            // bare IRI string e.g. "/api/tickets/01a0781d-..." or "/api/tickets/123"
            const m = rawTicket.match(/\/([^/]+)$/);
            ticket = m ? { id: m[1], '@id': rawTicket } : { '@id': rawTicket };
        } else if (typeof rawTicket === 'object' && !rawTicket.id) {
            // object with '@id' but no id field
            const iri = rawTicket['@id'];
            if (iri) {
                const m = String(iri).match(/\/([^/]+)$/);
                if (m) ticket = { ...rawTicket, id: m[1] };
            }
        }
    }
    return { ...chat, id: extractId(chat) ?? chat.id, ticket };
};

/**
 * Low-level POST /api/chats — always creates a new chat, no existing-chat lookup.
 * Callers that need "reuse if one already exists" should resolve that themselves first
 * (see `resolveTicketChat`) or go through `createChatWithAuthor` for the simple case.
 */
const postNewChat = async (replyAuthorId: string | number, ticketId?: string | number): Promise<Chat> => {
    const userStatus = await checkUserStatus(replyAuthorId);
    if (!userStatus.approved || !userStatus.active) {
        throw new Error(i18n.t('components:chat.userInactive'));
    }

    const chatData: { replyAuthor: string; ticket?: string } = {
        replyAuthor: API_ROUTES.USER_BY_ID(replyAuthorId),
    };
    if (ticketId) chatData.ticket = API_ROUTES.TICKET_BY_ID(ticketId);

    try {
        const rawResponse = await universalApiRequest(API_ROUTES.CHATS, {
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
 * Creates a new chat with the given user (replyAuthor), or returns the
 * existing chat if one already exists between the current user and replyAuthorId.
 *
 * No-ticket "message this person" convenience (e.g. a plain "Написать" button on a
 * profile) — reuses ANY existing chat with that person regardless of ticket. For
 * responding to a specific ad/service, use `resolveTicketChat` instead: this function's
 * "reuse any chat" behavior is exactly the wrong call there (it would silently attach the
 * response to an unrelated chat instead of creating the ticket-scoped one — or, worse,
 * a chat the reader has to guess is now "about" this ad).
 *
 * @param replyAuthorId  ID of the user to start a chat with (string UUID or number)
 * @param ticketId       Optional: link the chat to a specific ticket (string UUID or number)
 * @throws Error when the target user is inactive or the API call fails
 */
export const createChatWithAuthor = async (replyAuthorId: string | number, ticketId?: string | number): Promise<Chat | null> => {
    const token = getAuthToken();
    if (!token) return null;

    const existingChat = await findExistingChat(replyAuthorId);
    if (existingChat) return existingChat;

    return postNewChat(replyAuthorId, ticketId);
};

/** Always creates a brand-new ticket-scoped chat, bypassing any existing-chat reuse —
 *  used by the "Откликнуться на это объявление" choice after `resolveTicketChat` found
 *  only a general chat and the user explicitly chose to respond anyway. */
export const createTicketChat = (replyAuthorId: string | number, ticketId: string | number): Promise<Chat> =>
    postNewChat(replyAuthorId, ticketId);

export type RespondOutcome =
    /** An exact ticket-scoped chat with this person already exists — go straight to it. */
    | { type: 'existing'; chat: Chat }
    /** No conflicting chat found — a fresh ticket-scoped chat was created and can be opened. */
    | { type: 'created'; chat: Chat }
    /** Only a general (ticket: null) chat exists — ask the user whether to continue there
     *  or start a separate thread for this ad (see `ExistingChatChoice` modal). */
    | { type: 'choice'; generalChat: Chat };

/**
 * The check-before-respond flow: `GET /api/chats/me?user={replyAuthorId}` returns every
 * chat between the caller and that person — general (ticket: null) and per-ad alike — in
 * one request. Classifies the result and decides what to do:
 *   - a chat already scoped to THIS ticket exists → reuse it (`existing`)
 *   - only a general chat exists → the caller must ask the user (`choice`)
 *   - anything else (no chats, or only chats for OTHER tickets) → safe to create (`created`)
 */
export const resolveTicketChat = async (replyAuthorId: string | number, ticketId: string | number): Promise<RespondOutcome> => {
    const chats = await getChatsWithUser(replyAuthorId);

    let generalChat: Chat | null = null;
    for (const chat of chats) {
        const chatTicketId = (chat as any).ticket?.id;
        if (chatTicketId != null && String(chatTicketId) === String(ticketId)) {
            return { type: 'existing', chat };
        }
        if (chatTicketId == null && !generalChat) {
            generalChat = chat;
        }
    }

    if (generalChat) return { type: 'choice', generalChat };

    const chat = await postNewChat(replyAuthorId, ticketId);
    return { type: 'created', chat };
};

/**
 * Checks whether the given user is approved and active before allowing
 * chat creation.  Returns { approved: false, active: false } on any error.
 */
export const checkUserStatus = async (userId: string | number): Promise<{ approved: boolean; active: boolean }> => {
    try {
        const token = getAuthToken();
        if (!token) return { approved: false, active: false };
        const userData: User = await universalApiRequest(API_ROUTES.USER_BY_ID(userId), { locale: false });
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

    _chatsMePromise = universalApiRequest(API_ROUTES.CHATS_ME, { locale: false }).then((responseData) => {
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
        chatsArray = chatsArray.map(normalizeChatTicket);
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

/**
 * `GET /api/chats/me?user={userId}` — every chat between the caller and that one person,
 * general (ticket: null) and per-ad alike, in a single request. Not cached (unlike
 * `getChatsMe`) — this is called once right before a respond action, not on every render.
 *
 * The endpoint 404s (not 200+[]) when there are no chats with that person at all — this is
 * existing `/chats/me` behavior (same as `?ticket=` with no matches), not specific to the
 * `?user=` filter, so it's treated as "no chats" here rather than an error.
 */
export const getChatsWithUser = async (userId: string | number): Promise<Chat[]> => {
    try {
        const responseData = await universalApiRequest(`${API_ROUTES.CHATS_ME}?user=${userId}`, { locale: false });
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
        return chatsArray.map(normalizeChatTicket);
    } catch (e: any) {
        if (e?.http === 404 || e?.status === 404) return [];
        throw e;
    }
};

const findExistingChat = async (replyAuthorId: string | number): Promise<Chat | null> => {
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