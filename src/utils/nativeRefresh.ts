import { invalidateBlacklistCache } from '../hooks/useBlacklist';
import { invalidateFavoritesCache } from '../hooks/useFavorites';
import { clearCache as clearDataMemoryCache } from './dataCacheUtils';
import { clearApiCache } from './apiCache';
import { clearImageCache } from './imageCacheUtils';
import { clearImageFailureCache } from './imageFailureCache';
import { clearAppMessagesCache } from './appMessagesUtils';
import { clearBlurhashCache } from './blurhashUtils';
import { clearCurrentUserCache } from './authUtils';
import { invalidateChatsCache } from './chatUtils';
import { clearTicketTranslationCache } from './textUtils';
import { clearNativeWebViewCache } from './nativeWebViewCache';
import { stopNativePrefetch } from './nativePrefetch';

const clearBrowserCacheStorage = async (): Promise<void> => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)));
    } catch {
        // Cache Storage may be disabled by the WebView; continue with the other caches.
    }
};

const clearCachedSessionData = (): void => {
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (
                key === 'categories-list'
                || key?.startsWith('cat-name-')
                || key?.startsWith('cat-desc-')
            ) {
                sessionStorage.removeItem(key);
            }
        }
    } catch {
        // Session storage may be unavailable; memory caches are still cleared.
    }
};

/** Clears application and WebView resource caches without removing auth, cookies, or preferences. */
export const clearNativeAppCaches = async (): Promise<void> => {
    stopNativePrefetch();

    // In-memory response and request caches.
    clearApiCache();
    clearDataMemoryCache();
    clearCurrentUserCache();
    invalidateFavoritesCache();
    invalidateBlacklistCache();
    invalidateChatsCache();
    clearAppMessagesCache();
    clearBlurhashCache();
    clearImageFailureCache();

    // Persisted application data caches; app state such as favorites and search filters is preserved.
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith('dataCache:') || key?.startsWith('apiCache:') || key === 'ticketTranslationCache') {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // Storage may be unavailable; continue with IndexedDB and WebView caches.
    }
    try { clearTicketTranslationCache(); } catch { /* ignore inaccessible localStorage */ }
    clearCachedSessionData();

    // IndexedDB image blobs, Cache Storage buckets, and the platform's HTTP/WebView resource cache.
    const results = await Promise.allSettled([
        clearImageCache(),
        clearBrowserCacheStorage(),
        clearNativeWebViewCache(),
    ]);
    const failedClear = results.find(result => result.status === 'rejected');
    if (failedClear?.status === 'rejected') throw failedClear.reason;
};
