import { useState, useCallback } from 'react';
import { getAuthToken } from '../../utils/auth';
import { getStorageJSON, setStorageJSON } from '../../utils/storageHelper';

// Flat entry returned by GET /api/favorites/me (hydra:member)
interface FavoriteEntry {
    id: number;           // entry id — used for DELETE
    type: 'user' | 'ticket';
    user: { id: number } | null;
    ticket: { id: number } | null;
}

interface LocalStorageFavorites {
    tickets: number[];
}

interface UseFavoritesProps {
    itemId: number;
    itemType: 'ticket' | 'user';
    onSuccess?: () => void;
    onError?: (message: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Module-level cache to deduplicate concurrent /api/favorites/me requests
let _favoritesPromise: Promise<FavoriteEntry[]> | null = null;
let _favoritesCache: { data: FavoriteEntry[]; timestamp: number } | null = null;
const FAVORITES_CACHE_TTL = 30 * 1000; // 30 seconds

const invalidateFavoritesCache = () => {
    _favoritesCache = null;
    _favoritesPromise = null;
};

export const useFavorites = ({ itemId, itemType, onSuccess, onError }: UseFavoritesProps) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [entryId, setEntryId] = useState<number | null>(null); // FavoriteEntry id for DELETE

    const loadLocalStorageFavorites = (): LocalStorageFavorites => {
        try {
            const stored = getStorageJSON<LocalStorageFavorites>('favorites');
            if (stored) {
                return { tickets: Array.isArray(stored.tickets) ? stored.tickets : [] };
            }
        } catch { /* ignore */ }
        return { tickets: [] };
    };

    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            setStorageJSON('favorites', favorites);
        } catch { /* ignore */ }
    };

    // Fetch all favorite entries from GET /api/favorites/me (with dedup/cache)
    const getCurrentFavorites = useCallback(async (token: string): Promise<FavoriteEntry[]> => {
        const now = Date.now();

        if (_favoritesCache && now - _favoritesCache.timestamp < FAVORITES_CACHE_TTL) {
            return _favoritesCache.data;
        }

        if (!_favoritesPromise) {
            _favoritesPromise = fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            }).then(async (response) => {
                if (!response.ok) throw new Error(`Failed to fetch favorites: ${response.status}`);
                const data = await response.json();
                const entries: FavoriteEntry[] = data['hydra:member'] ?? (Array.isArray(data) ? data : []);
                _favoritesCache = { data: entries, timestamp: Date.now() };
                _favoritesPromise = null;
                return entries;
            }).catch((err) => {
                _favoritesPromise = null;
                throw err;
            });
        }

        return _favoritesPromise;
    }, []);

    const checkFavoriteStatus = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            if (itemType === 'ticket') {
                const local = loadLocalStorageFavorites();
                setIsLiked(local.tickets.includes(itemId));
            } else {
                setIsLiked(false);
            }
            return;
        }

        try {
            const entries = await getCurrentFavorites(token);
            const match = entries.find(e =>
                e.type === itemType &&
                (itemType === 'ticket' ? e.ticket?.id === itemId : e.user?.id === itemId)
            );
            setIsLiked(!!match);
            setEntryId(match?.id ?? null);
        } catch {
            setIsLiked(false);
            setEntryId(null);
        }
    }, [itemId, itemType, getCurrentFavorites]);

    const handleLikeClick = async () => {
        const token = getAuthToken();

        // Unauth — localStorage only (tickets only)
        if (!token) {
            if (itemType !== 'ticket') return;
            const local = loadLocalStorageFavorites();
            if (local.tickets.includes(itemId)) {
                saveLocalStorageFavorites({ tickets: local.tickets.filter(id => id !== itemId) });
                setIsLiked(false);
            } else {
                saveLocalStorageFavorites({ tickets: [...local.tickets, itemId] });
                setIsLiked(true);
            }
            window.dispatchEvent(new Event('favoritesUpdated'));
            return;
        }

        // Unlike — DELETE /api/favorites/{entryId}
        if (isLiked && entryId) {
            setIsLikeLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/favorites/${entryId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok || res.status === 204) {
                    setIsLiked(false);
                    setEntryId(null);
                    invalidateFavoritesCache();
                    window.dispatchEvent(new Event('favoritesUpdated'));
                    if (onSuccess) onSuccess();
                } else {
                    if (onError) onError('Ошибка при удалении из избранного');
                }
            } catch {
                if (onError) onError('Ошибка при удалении из избранного');
            } finally {
                setIsLikeLoading(false);
            }
            return;
        }

        // Like — POST /api/favorites { ticket: IRI } or { user: IRI }
        setIsLikeLoading(true);
        try {
            const body = itemType === 'ticket'
                ? { ticket: `/api/tickets/${itemId}` }
                : { user: `/api/users/${itemId}` };

            const res = await fetch(`${API_BASE_URL}/api/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body),
            });

            if (res.status === 201 || res.ok) {
                const newEntry: FavoriteEntry = await res.json();
                setIsLiked(true);
                setEntryId(newEntry.id);
                invalidateFavoritesCache();
                window.dispatchEvent(new Event('favoritesUpdated'));
                if (onSuccess) onSuccess();
            } else if (res.status === 409) {
                // Already in favorites — re-check to pick up entryId
                invalidateFavoritesCache();
                await checkFavoriteStatus();
            } else {
                if (onError) onError('Ошибка при добавлении в избранное');
            }
        } catch {
            if (onError) onError('Ошибка при добавлении в избранное');
        } finally {
            setIsLikeLoading(false);
        }
    };

    return {
        isLiked,
        isLikeLoading,
        handleLikeClick,
        checkFavoriteStatus,
        setIsLiked
    };
};
