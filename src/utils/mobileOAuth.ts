/**
 * OAuth completion for the packaged Capacitor app.
 *
 * Why this exists: `window.open()` (used by utils/oauthPopup.ts for the web build) does
 * NOT create a real popup inside Capacitor's WebView. Verified live via Chrome DevTools
 * Protocol against the running app: calling `window.open()` there hands the navigation off
 * to an entirely separate, external Chrome instance — our JS gets back an inert window
 * reference with no `opener` link and a `.closed` flag that never flips, and Facebook/
 * Google/Instagram/Telegram all end up starting their auth flow from origin
 * `https://localhost` (the app's own bundle), which no provider has registered as a valid
 * domain/redirect target (Telegram's widget rejects it outright: "Bot domain invalid").
 *
 * The fix mirrors the standard native-app OAuth pattern:
 *  1. Open the flow on the real, public website (APP_WEB_ORIGIN) in an in-app browser
 *     (`@capacitor/browser` — Chrome Custom Tabs / SFSafariViewController) instead of the
 *     packaged app's own `https://localhost` bundle. Every provider sees the real domain
 *     they actually have registered, because it's literally the live site.
 *  2. That website is the SAME React app (this repo's `front` branch) — its existing
 *     OAuthCallbackPage / TelegramCallbackPage already do the full code-exchange dance.
 *     Once they have a token, `finishMobileOAuthFlow` (called from those pages) hands it
 *     back to the native app via a custom URL scheme (`tj.ustoyob.app://oauth-callback`).
 *  3. Android/iOS intercept navigation to that scheme — even from inside a Custom Tab /
 *     SFSafariViewController — as a normal app-link Intent, which `@capacitor/app`'s
 *     `appUrlOpen` event picks up (`startNativeOAuth` below registers a listener scoped
 *     to each call, removed again once that flow settles).
 *
 * IMPORTANT — this needs the SAME frontend changes deployed to the public website (the
 * `front` branch), not just bundled into the app: `isMobileOAuthFlow`/`finishMobileOAuthFlow`
 * live in shared pages (OAuthCallbackPage, TelegramCallbackPage) precisely so one deploy of
 * the website covers both. Until that's deployed, native OAuth will open the browser but
 * never complete the round trip back to the app.
 */
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App, type URLOpenListenerEvent } from '@capacitor/app';

/**
 * Public website origin. The in-app browser is pointed here — never at the packaged app's
 * own `https://localhost` bundle — so OAuth providers see the real, registered domain.
 * Override via VITE_APP_ORIGIN if the site isn't at the default.
 */
export const APP_WEB_ORIGIN: string = (import.meta.env.VITE_APP_ORIGIN as string) || 'https://ustoyob.tj';

/** Custom URL scheme registered in AndroidManifest.xml / Info.plist for this app. */
export const OAUTH_APP_SCHEME = 'tj.ustoyob.app';
const OAUTH_CALLBACK_HOST = 'oauth-callback';
const MOBILE_FLOW_STORAGE_KEY = 'mobileOAuthFlow';
/** How long to wait for `appUrlOpen` after `browserFinished` before treating it as a cancel. */
const BROWSER_FINISHED_GRACE_MS = 1500;

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

/**
 * Call on mount of a page that may have been opened by the app's in-app browser (reads
 * `?mobile=1` from the current URL). Persists the marker in sessionStorage so it survives
 * the redirect chain through the OAuth provider and back to our own callback page — a
 * different page load, on the same origin/tab, same-origin sessionStorage carries over
 * (this is the exact same assumption the existing CSRF `state` check already relies on).
 */
export function markMobileOAuthFlowFromUrl(): void {
    if (new URLSearchParams(window.location.search).get('mobile') === '1') {
        try { sessionStorage.setItem(MOBILE_FLOW_STORAGE_KEY, '1'); } catch { /* private mode */ }
    }
}

/** True when the current page load is part of a flow started by the app's in-app browser. */
export function isMobileOAuthFlow(): boolean {
    try { return sessionStorage.getItem(MOBILE_FLOW_STORAGE_KEY) === '1'; } catch { return false; }
}

/**
 * Call from a callback page (OAuthCallbackPage / TelegramCallbackPage) once a result is
 * known. If this page load was flagged by `markMobileOAuthFlowFromUrl`, hands the result to
 * the native app via the custom URL scheme and returns true — the caller should stop right
 * there (no popup-signalling / window.close(), that machinery is web-only). Returns false
 * when this isn't a mobile-app flow, so the caller falls back to its normal behaviour.
 */
export function finishMobileOAuthFlow(result: { status: 'success'; token: string } | { status: 'error'; message?: string }): boolean {
    if (!isMobileOAuthFlow()) return false;
    try { sessionStorage.removeItem(MOBILE_FLOW_STORAGE_KEY); } catch { /* ignore */ }

    const params = new URLSearchParams({ status: result.status });
    if (result.status === 'success') params.set('token', result.token);
    else if (result.message) params.set('message', result.message);

    window.location.href = `${OAUTH_APP_SCHEME}://${OAUTH_CALLBACK_HOST}?${params.toString()}`;
    return true;
}

export interface NativeOAuthResult {
    token: string;
}

/**
 * Native-app counterpart of utils/oauthPopup.ts's `openOAuthPopup` + `waitForOAuthPopupResult`
 * pair. Opens `path` (an `/auth/...` route) on the real public website in an in-app browser
 * and resolves once that page reports success back through the custom-scheme deep link, or
 * rejects with `Error('popup_closed')` if the user closes the in-app browser first — same
 * contract as the web popup flow, so callers barely need to branch beyond which one to call.
 */
export function startNativeOAuth(path: string): Promise<NativeOAuthResult> {
    return new Promise((resolve, reject) => {
        let settled = false;
        let appUrlListener: PluginListenerHandle | null = null;
        let browserFinishedListener: PluginListenerHandle | null = null;
        let cancelTimer: ReturnType<typeof setTimeout> | undefined;

        const cleanup = () => {
            clearTimeout(cancelTimer);
            appUrlListener?.remove();
            browserFinishedListener?.remove();
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
            let url: URL;
            try { url = new URL(event.url); } catch { return; }
            if (url.host !== OAUTH_CALLBACK_HOST && !url.pathname.includes(OAUTH_CALLBACK_HOST)) return;

            Browser.close().catch(() => { /* already closing itself */ });

            const token = url.searchParams.get('token');
            if (url.searchParams.get('status') === 'success' && token) {
                finish(() => resolve({ token }));
                return;
            }
            const message = url.searchParams.get('message') ?? undefined;
            finish(() => reject(new Error(message || 'oauth_failed')));
        }).then((listener) => { appUrlListener = listener; });

        // Пользователь закрыл in-app browser сам, не дойдя до колбэка — ровно то же
        // событие, что 'popup_closed' в веб-варианте (см. oauthPopup.ts).
        //
        // НЕ отклоняем сразу: когда Custom Tab возвращает в приложение через диплинк
        // (успешный вход), Android сначала сообщает о возврате в приложение
        // (`browserFinished`) и лишь ПОТОМ доставляет сам `appUrlOpen` (проверено на
        // эмуляторе: ~120 мс разницы). Мгновенный reject тут снимал слушатели раньше,
        // чем приходил диплинк с токеном — вход "проходил", но приложение считало его
        // отменой и оставалось неавторизованным. Даём диплинку шанс, и только потом
        // считаем это отменой.
        Browser.addListener('browserFinished', () => {
            cancelTimer = setTimeout(() => finish(() => reject(new Error('popup_closed'))), BROWSER_FINISHED_GRACE_MS);
        }).then((listener) => { browserFinishedListener = listener; });

        const separator = path.includes('?') ? '&' : '?';
        Browser.open({ url: `${APP_WEB_ORIGIN}${path}${separator}mobile=1` }).catch((err) => {
            finish(() => reject(err instanceof Error ? err : new Error('browser_open_failed')));
        });
    });
}
