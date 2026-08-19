import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../utils/authUtils';
import { universalApiRequest, parsePagedResponse } from '../utils/apiUtils';
import { openMercureSource } from '../utils/mercureUtils';

interface ChatListEntry {
    unreadCount?: number;
}

// Highest itemsPerPage the endpoint documents — good enough for the header badge (a user
// with more than this many concurrently-unread chats is an edge case we accept missing).
const CHATS_PAGE_SIZE = 50;

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
            const responseData = await universalApiRequest(`/api/chats/me?page=1&itemsPerPage=${CHATS_PAGE_SIZE}`, { locale: false });
            const { items } = parsePagedResponse<ChatListEntry>(responseData, 1, CHATS_PAGE_SIZE);
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
                const { token: mercureToken, topics } = await universalApiRequest('/api/chats/inbox-token', { locale: false }) as { token: string | null; topics: string[] };
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
