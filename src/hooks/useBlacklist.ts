import { useState, useCallback } from 'react';
import { getAuthToken } from '../utils/authUtils';
import { universalApiRequest } from '../utils/apiUtils';
import { resolveApiError } from '../utils/appMessagesUtils';

// Flat entry returned by GET /api/black-lists/me — a block is always exactly one user now,
// no `type`/`ticket` variant (redesigned, see API_REFERENCE.md §10).
export interface BlackListEntry {
    id: number;
    user: { id: number } | null;
}

// Module-level cache to deduplicate concurrent /api/black-lists/me requests — shared by
// every caller (the single-target hook below, and any page that needs the whole list, e.g.
// Chat.tsx's sidebar rows) so there's exactly one cache/in-flight request regardless of how
// many places ask for it.
let _blacklistPromise: Promise<BlackListEntry[]> | null = null;
let _blacklistCache: { data: BlackListEntry[]; timestamp: number } | null = null;
const BLACKLIST_CACHE_TTL = 30 * 1000; // 30 seconds

/** Clears both the in-memory cache and the in-flight promise. Call after a block/unblock. */
export const invalidateBlacklistCache = (): void => {
    _blacklistCache = null;
    _blacklistPromise = null;
};

/** Fetches (and caches/dedupes) the caller's own block list. */
export const fetchBlacklistEntries = async (): Promise<BlackListEntry[]> => {
    if (!getAuthToken()) return [];

    const now = Date.now();
    if (_blacklistCache && now - _blacklistCache.timestamp < BLACKLIST_CACHE_TTL) {
        return _blacklistCache.data;
    }

    if (!_blacklistPromise) {
        _blacklistPromise = universalApiRequest('/api/black-lists/me', { locale: false }).then((data: any) => {
            const entries: BlackListEntry[] = data['hydra:member'] ?? (Array.isArray(data) ? data : []);
            _blacklistCache = { data: entries, timestamp: Date.now() };
            _blacklistPromise = null;
            return entries;
        }).catch((err: unknown) => {
            _blacklistPromise = null;
            throw err;
        });
    }

    return _blacklistPromise;
};

/** POST /api/black-lists — blocks a user, returns the created entry. */
export const blockUser = (userId: number): Promise<BlackListEntry> =>
    universalApiRequest('/api/black-lists', {
        method: 'POST',
        body: { user: `/api/users/${userId}` },
        locale: false,
    }).then((entry: BlackListEntry) => {
        invalidateBlacklistCache();
        return entry;
    });

/** DELETE /api/black-lists/{entryId} — unblocks. */
export const unblockUser = (entryId: number): Promise<void> =>
    universalApiRequest(`/api/black-lists/${entryId}`, { method: 'DELETE', locale: false }).then(() => {
        invalidateBlacklistCache();
    });

interface UseBlacklistProps {
    userId: number;
    onSuccess?: (blocked: boolean) => void;
    onError?: (message: string) => void;
}

/**
 * Blocking a chat user (§10) — chat-only and asymmetric: blocking `userId` stops *them* from
 * messaging you (`POST /chats`, `POST /chat-messages` → `403 user_blocked`), but you can still
 * message them if you want. Single-target convenience wrapper around the module-level fetch/
 * block/unblock above, for pages that only ever need one user's status at a time (e.g. a
 * profile page's block button). Pages tracking many users at once (e.g. Chat.tsx's sidebar)
 * should call `fetchBlacklistEntries`/`blockUser`/`unblockUser` directly instead — one hook
 * instance per list row isn't legal (hooks can't live inside `.map()`).
 */
export const useBlacklist = ({ userId, onSuccess, onError }: UseBlacklistProps) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockLoading, setIsBlockLoading] = useState(false);
    const [entryId, setEntryId] = useState<number | null>(null);

    const checkBlockedStatus = useCallback(async () => {
        if (!userId) {
            setIsBlocked(false);
            setEntryId(null);
            return;
        }

        try {
            const entries = await fetchBlacklistEntries();
            const match = entries.find(e => e.user?.id === userId);
            setIsBlocked(!!match);
            setEntryId(match?.id ?? null);
        } catch {
            setIsBlocked(false);
            setEntryId(null);
        }
    }, [userId]);

    const handleToggleBlock = useCallback(async () => {
        if (!userId || isBlockLoading) return;
        setIsBlockLoading(true);
        try {
            if (isBlocked && entryId) {
                await unblockUser(entryId);
                setIsBlocked(false);
                setEntryId(null);
                onSuccess?.(false);
            } else {
                const entry = await blockUser(userId);
                setIsBlocked(true);
                setEntryId(entry.id);
                onSuccess?.(true);
            }
        } catch (err) {
            onError?.(resolveApiError(err));
        } finally {
            setIsBlockLoading(false);
        }
    }, [userId, isBlocked, entryId, isBlockLoading, onSuccess, onError]);

    return { isBlocked, isBlockLoading, entryId, checkBlockedStatus, handleToggleBlock };
};
