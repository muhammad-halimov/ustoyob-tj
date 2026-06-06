/**
 * AppMessages — localized server-side message registry.
 *
 * The backend exposes every user-facing message at:
 *   GET /api/app-messages?locale=<locale>
 *
 * Calling `loadAppMessages()` once at app startup (and on locale changes)
 * fills an in-memory map so that `getAppMessage(code)` can be called
 * synchronously anywhere in the app.
 *
 * Usage in catch blocks:
 *   catch (err) {
 *       setError(resolveApiError(err));
 *   }
 */

import { getDefaultLocale } from './storageUtils';
import { API_BASE_URL } from './configUtils';
import type { LocaleType } from './apiUtils';
import i18n from 'i18next';

export interface AppMessage {
    code: string;
    message: string;
    http: number;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

/** Map of code → AppMessage, populated by loadAppMessages(). */
const _cache = new Map<string, AppMessage>();
let _loadedLocale: string | null = null;
let _loadPromise: Promise<void> | null = null;

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all app messages from the backend for the given (or current) locale
 * and stores them in the in-memory cache.
 *
 * Deduplicates concurrent calls — if a load is already in progress the same
 * Promise is returned.  A forced reload can be triggered with `force = true`.
 */
export const loadAppMessages = (locale?: LocaleType, force = false): Promise<void> => {
    const targetLocale = locale ?? getDefaultLocale();

    if (!force && _loadedLocale === targetLocale && _cache.size > 0) {
        return Promise.resolve();
    }

    if (_loadPromise && !force) return _loadPromise;

    _loadPromise = fetch(`${API_BASE_URL}/api/app-messages?locale=${targetLocale}`)
        .then(res => {
            if (!res.ok) throw new Error(`app-messages fetch failed: ${res.status}`);
            return res.json();
        })
        .then((data: AppMessage[]) => {
            _cache.clear();
            for (const msg of data) {
                _cache.set(msg.code, msg);
            }
            _loadedLocale = targetLocale;
        })
        .catch(err => {
            // Non-fatal: messages will fall back to err.message / hardcoded fallback
            console.warn('[appMessages] Could not load app messages:', err);
        })
        .finally(() => {
            _loadPromise = null;
        });

    return _loadPromise;
};

// ─── Lookup ───────────────────────────────────────────────────────────────────
// ─── Error resolution ─────────────────────────────────────────────────────────

/**
 * Custom error thrown by universalApiRequest when the server returns a
 * non-2xx response that includes a `code` field in the JSON body.
 */
export class ApiError extends Error {
    readonly code: string;
    readonly http: number;

    constructor(code: string, message: string, http: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.http = http;
    }
}

/**
 * Resolves a user-facing error message from a caught value.
 *
 * Priority:
 *  1. If the error is an `ApiError` and its `code` is in the cache → use the
 *     localised text from the cache.
 *  2. If the error is an `ApiError` without a cache hit → use `error.message`
 *     (the server-provided message already embedded in the error).
 *  3. Generic `Error` → `error.message`.
 *  4. Anything else → `fallback` (default: 'Произошла ошибка').
 */
export const resolveApiError = (err: unknown, fallback?: string): string => {
    const defaultFallback = fallback ?? i18n.t('common:app.error');
    if (err instanceof ApiError) {
        const cached = _cache.get(err.code);
        return cached?.message ?? err.message ?? defaultFallback;
    }
    if (err instanceof Error) return err.message || defaultFallback;
    return defaultFallback;
};
