import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../utils/authUtils';
import { universalApiRequest } from '../utils/apiUtils';
import { fetchAllPages } from '../utils/paginationUtils';
import { openMercureSource } from '../utils/mercureUtils';
import { API_ROUTES } from '../app/routers/routes';

interface ChatListEntry {
    unreadCount?: number;
}

/** Sums `unreadCount` across the caller's chats (`GET /api/chats/me`) for the header's
 *  unread-messages badge, and keeps it live over the same inbox Mercure topic Chat.tsx
 *  subscribes to (see `startInboxSSE`) — any created/updated/deleted event there just means
 *  "something changed", so this debounces into a refetch rather than trusting event payloads. */
export const useUnreadChatsCount = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const sourceRef = useRef<EventSource | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchUnreadCount = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            setUnreadCount(0);
            return;
        }
        try {
            // Бейдж считает непрочитанные по ВСЕМ чатам — раньше брались только первые 50 (и недосчитывал).
            const items = await fetchAllPages<ChatListEntry>(API_ROUTES.CHATS_ME, { locale: false });
            const total = items.reduce((sum, chat) => sum + (chat.unreadCount ?? 0), 0);
            setUnreadCount(total);
        } catch {
            // Badge just stays at its last known value on a transient failure.
        }
    }, []);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            setUnreadCount(0);
            return;
        }

        fetchUnreadCount();

        let cancelled = false;
        (async () => {
            try {
                const { token: mercureToken, topics } = await universalApiRequest(API_ROUTES.CHATS_INBOX_TOKEN, { locale: false }) as { token: string | null; topics: string[] };
                if (cancelled || !mercureToken || !topics?.length) return;

                const es = openMercureSource(topics, mercureToken);
                sourceRef.current = es;
                es.onmessage = () => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        debounceRef.current = null;
                        fetchUnreadCount();
                    }, 300);
                };
                es.onerror = () => { /* EventSource auto-reconnects */ };
            } catch {
                // Real-time is a progressive enhancement — the initial fetch above still ran.
            }
        })();

        return () => {
            cancelled = true;
            sourceRef.current?.close();
            sourceRef.current = null;
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchUnreadCount]);

    return unreadCount;
};
