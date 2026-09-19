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
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { ROUTES } from '../app/routers/routes';
import { setAuthToken, setUserRole, setUserOccupation, fetchCurrentUser, isAdmin, getUserRole } from './authUtils';
import type { Occupation } from '../entities';

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
/**
 * How long the auth modal keeps waiting for the deep link after `browserFinished` before it
 * stops its spinner as a "cancelled". Only affects the modal's UI — a link that arrives later
 * is still handled by the always-on listener (see `initNativeOAuthDeepLinks`).
 */
const BROWSER_FINISHED_GRACE_MS = 1500;
/** Last deep-link token we already acted on — guards against the OS replaying the same intent. */
const HANDLED_TOKEN_STORAGE_KEY = 'nativeOAuthHandledToken';

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

interface PendingFlow {
    resolve: (result: NativeOAuthResult) => void;
    reject: (err: Error) => void;
}

/** The auth modal's in-flight `startNativeOAuth` call, if any (only one at a time). */
let pendingFlow: PendingFlow | null = null;

/**
 * Signs the user in from a bare JWT (no auth modal involved): stores the token, hydrates the
 * user via /users/me, derives role/occupation the same way the modal does, then reloads so
 * the whole app picks up the logged-in state. Used when the deep link arrives when nothing is
 * waiting for it — the modal already gave up, or the app was restarted while the user was in
 * the browser.
 */
async function completeNativeLogin(token: string): Promise<void> {
    setAuthToken(token);

    const user = await fetchCurrentUser();
    if (user) {
        const roles = (user.roles || []).map((r) => r.toLowerCase());
        setUserRole(roles.includes('role_master') || roles.includes('master') ? 'master' : 'client');
        if (user.occupation) setUserOccupation(user.occupation as Occupation[]);
    } else if (!getUserRole()) {
        setUserRole('client');
    }

    window.dispatchEvent(new Event('login'));
    if (isAdmin()) window.location.href = ROUTES.TECH_SUPPORT;
    else window.location.reload();
}

function wasTokenHandled(token: string): boolean {
    try { return localStorage.getItem(HANDLED_TOKEN_STORAGE_KEY) === token; } catch { return false; }
}

function rememberHandledToken(token: string): void {
    try { localStorage.setItem(HANDLED_TOKEN_STORAGE_KEY, token); } catch { /* ignore */ }
}

function handleOAuthDeepLink(rawUrl: string): void {
    let url: URL;
    try { url = new URL(rawUrl); } catch { return; }
    if (url.host !== OAUTH_CALLBACK_HOST && !url.pathname.includes(OAUTH_CALLBACK_HOST)) return;

    Browser.close().catch(() => { /* already closing itself */ });

    const token = url.searchParams.get('token');
    if (url.searchParams.get('status') === 'success' && token) {
        if (wasTokenHandled(token)) return;
        rememberHandledToken(token);

        if (pendingFlow) {
            const flow = pendingFlow;
            pendingFlow = null;
            flow.resolve({ token });
        } else {
            completeNativeLogin(token).catch(() => { /* leave the user on the current screen */ });
        }
        return;
    }

    if (pendingFlow) {
        const flow = pendingFlow;
        pendingFlow = null;
        flow.reject(new Error(url.searchParams.get('message') || 'oauth_failed'));
    }
}

/**
 * Registers the app-wide listener for the OAuth deep link — call once at startup (main.tsx),
 * native platform only.
 *
 * Deliberately NOT scoped to a single `startNativeOAuth` call: on Android the Custom Tab
 * reports `browserFinished` well BEFORE the deep link arrives (observed ~3s earlier on a real
 * Telegram login — the callback page still has to call the backend before it can hand the
 * token over). A per-call listener gave up on that early signal and dropped the token, leaving
 * the user "signed in" in the browser but not in the app. An always-on listener also covers a
 * cold start from the link (`getLaunchUrl`) if the OS killed the app while the user was away.
 */
export function initNativeOAuthDeepLinks(): void {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => handleOAuthDeepLink(event.url));
    App.getLaunchUrl().then((launch) => { if (launch?.url) handleOAuthDeepLink(launch.url); }).catch(() => { /* none */ });
}

/**
 * Native-app counterpart of utils/oauthPopup.ts's `openOAuthPopup` + `waitForOAuthPopupResult`
 * pair. Opens `path` (an `/auth/...` route) on the real public website in an in-app browser
 * and resolves once the deep link reports success (see `initNativeOAuthDeepLinks`), or rejects
 * with `Error('popup_closed')` if the browser closes and no deep link follows shortly after —
 * same contract as the web popup flow, so callers barely need to branch beyond which to call.
 */
export function startNativeOAuth(path: string): Promise<NativeOAuthResult> {
    return new Promise((resolve, reject) => {
        pendingFlow?.reject(new Error('popup_closed'));

        const flow: PendingFlow = { resolve, reject };
        pendingFlow = flow;

        const cancelIfStillPending = () => {
            if (pendingFlow !== flow) return;
            pendingFlow = null;
            reject(new Error('popup_closed'));
        };

        // Пользователь закрыл in-app browser сам, не дойдя до колбэка — ровно то же
        // событие, что 'popup_closed' в веб-варианте (см. oauthPopup.ts). Но это же событие
        // приходит и при УСПЕШНОМ возврате (раньше диплинка), поэтому даём диплинку время;
        // а если он всё-таки придёт позже — его подхватит постоянный слушатель.
        let finishedListener: { remove: () => void } | null = null;
        Browser.addListener('browserFinished', () => {
            finishedListener?.remove();
            setTimeout(cancelIfStillPending, BROWSER_FINISHED_GRACE_MS);
        }).then((listener) => { finishedListener = listener; });

        const separator = path.includes('?') ? '&' : '?';
        Browser.open({ url: `${APP_WEB_ORIGIN}${path}${separator}mobile=1` }).catch((err) => {
            finishedListener?.remove();
            if (pendingFlow === flow) pendingFlow = null;
            reject(err instanceof Error ? err : new Error('browser_open_failed'));
        });
    });
}
