import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../utils/authUtils';
import { resolveApiError } from '../utils/appMessagesUtils';
import {
    resolveTicketChat,
    createTicketChat,
    getChatsMe,
    persistRespondedTicketId,
    getPersistedRespondedTicketIds,
} from '../utils/chatUtils';
import { ROUTES } from '../app/routers/routes';
import type { Chat } from '../entities';

interface UseRespondToTicketProps {
    ticketId: string | number;
    /** The ticket's author/master — the person to open a chat with. */
    authorId: string | number;
    onError?: (message: string) => void;
}

/**
 * The check-before-respond flow (see `chatUtils.resolveTicketChat`): before creating a
 * ticket-scoped chat, checks whether the caller already has a chat with this person —
 * general (ticket: null) or for another ad, doesn't matter — and either reuses an exact
 * match, or (when only a general chat exists) surfaces a choice for the caller to render
 * via `ExistingChatChoice` instead of silently creating a duplicate or hijacking the wrong
 * thread.
 *
 * Mirrors `useFavorites`' shape/conventions (managed-state hook meant to back a Card's own
 * button) — `respond()` is the entry point, `choiceOpen`/`continueInGeneralChat`/
 * `respondAnyway`/`closeChoice` drive the modal when a choice is needed.
 */
export const useRespondToTicket = ({ ticketId, authorId, onError }: UseRespondToTicketProps) => {
    const navigate = useNavigate();
    const [isResponded, setIsResponded] = useState(false);
    // The ticket-scoped chat backing `isResponded` — lets a second click on an already-
    // "Откликнулся" button jump straight into that chat instead of being a dead end.
    const [respondedChatId, setRespondedChatId] = useState<string | number | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [pendingGeneralChat, setPendingGeneralChat] = useState<Chat | null>(null);

    // Optimistic "already responded" hint — sessionStorage, instant, no network. Just a
    // first-paint guess; the effect below is the real source of truth and can upgrade it.
    // Gated on being logged in: the marker isn't scoped per-account (see authUtils'
    // clearAuthData, which clears it on logout) — without this guard, a stray/pre-fix
    // marker could show "Откликнулся" to an anonymous visitor or a different logged-in
    // user in the same tab, who never actually responded themselves.
    useEffect(() => {
        if (getAuthToken() && getPersistedRespondedTicketIds().has(ticketId)) {
            setIsResponded(true);
        }
    }, [ticketId]);

    // Real check, against `getChatsMe()` (module-level cached + deduped, 15s TTL — many
    // Cards on one page share a single request, not one each). sessionStorage alone was
    // wrong across tabs/after a restart: a new tab has no sessionStorage entry, so a ticket
    // genuinely already responded to would show the plain "Откликнуться" button again.
    useEffect(() => {
        let cancelled = false;
        if (!ticketId || !getAuthToken()) return;

        (async () => {
            try {
                const chats = await getChatsMe();
                if (cancelled) return;
                const existing = chats.find(c => {
                    const chatTicketId = (c as any).ticket?.id;
                    return chatTicketId != null && String(chatTicketId) === String(ticketId);
                });
                if (existing) {
                    setIsResponded(true);
                    setRespondedChatId(existing.id);
                    persistRespondedTicketId(ticketId);
                }
            } catch {
                // Not critical — falls back to the sessionStorage-only hint above.
            }
        })();

        return () => { cancelled = true; };
    }, [ticketId]);

    const goToChat = useCallback((chatId: string | number) => {
        navigate(`${ROUTES.CHATS}?chatId=${chatId}`);
    }, [navigate]);

    const markResponded = useCallback((chat: Chat) => {
        persistRespondedTicketId(ticketId);
        setIsResponded(true);
        setRespondedChatId(chat.id);
        goToChat(chat.id);
    }, [ticketId, goToChat]);

    /** Entry point — wire to the "Откликнуться" button. Clicking again once already
     *  responded just opens that chat, same as Ticket.tsx's own respond button does. */
    const respond = useCallback(async () => {
        if (isResponding) return;

        if (isResponded) {
            if (respondedChatId != null) goToChat(respondedChatId);
            return;
        }

        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        setIsResponding(true);
        try {
            const outcome = await resolveTicketChat(authorId, ticketId);
            if (outcome.type === 'choice') {
                setPendingGeneralChat(outcome.generalChat);
                return; // wait for the user's modal choice — see continueInGeneralChat/respondAnyway
            }
            markResponded(outcome.chat);
        } catch (e) {
            onError?.(resolveApiError(e));
        } finally {
            setIsResponding(false);
        }
    }, [authorId, ticketId, isResponded, isResponding, respondedChatId, goToChat, markResponded, onError]);

    /** "Продолжить в общем чате" — open the existing general chat as-is; it's never
     *  retargeted to this ticket (PATCH /chats/{id} can't change `ticket`, only `active`). */
    const continueInGeneralChat = useCallback(() => {
        if (!pendingGeneralChat) return;
        const chat = pendingGeneralChat;
        setPendingGeneralChat(null);
        markResponded(chat);
    }, [pendingGeneralChat, markResponded]);

    /** "Откликнуться на это объявление" — explicitly create a separate ticket-scoped chat
     *  despite the general chat, bypassing the reuse check this time. */
    const respondAnyway = useCallback(async () => {
        setIsResponding(true);
        try {
            const chat = await createTicketChat(authorId, ticketId);
            setPendingGeneralChat(null);
            markResponded(chat);
        } catch (e) {
            onError?.(resolveApiError(e));
        } finally {
            setIsResponding(false);
        }
    }, [authorId, ticketId, markResponded, onError]);

    const closeChoice = useCallback(() => setPendingGeneralChat(null), []);

    return {
        respond,
        isResponded,
        isResponding,
        choiceOpen: !!pendingGeneralChat,
        continueInGeneralChat,
        respondAnyway,
        closeChoice,
    };
};
