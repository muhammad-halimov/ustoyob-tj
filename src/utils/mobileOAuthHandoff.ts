/**
 * Website half of the app's OAuth code hand-off (see utils/mobileOAuth.ts for the flow itself).
 *
 * Why: the backend hands out the refresh token only in an HttpOnly SameSite=Strict cookie, set in
 * the response to `POST /api/auth/{provider}/callback`. When this website page (running in the
 * app's in-app browser) performs that exchange, the cookie lands in the browser and never reaches
 * the app — so the app stayed signed in for the JWT's hour and was then logged out. With the
 * hand-off the page does NOT exchange: it passes the provider's `code`/`state` (Telegram: the
 * widget data) to the app through the deep link, and the app makes the very same request itself —
 * natively, so the cookie lands in the app.
 *
 * Opt-in: the app adds `native=2` to the start URL; older app builds don't, and keep getting the
 * ready JWT through `finishMobileOAuthFlow`. The flag lives in this tab's sessionStorage, like the
 * `mobile=1` marker it accompanies.
 */
import { isMobileOAuthFlow, OAUTH_APP_SCHEME } from './mobileOAuth';

const HANDOFF_STORAGE_KEY = 'mobileOAuthCodeHandoff';

/** Call on mount of an OAuth start page, right after `markMobileOAuthFlowFromUrl`. */
export function markCodeHandoffFromUrl(): void {
    if (new URLSearchParams(window.location.search).get('native') === '2') {
        try { sessionStorage.setItem(HANDOFF_STORAGE_KEY, '1'); } catch { /* private mode */ }
    }
}

/**
 * Call from a callback page instead of exchanging the code. `body` is exactly what the page would
 * send to `POST /api/auth/{provider}/callback`. Returns true when the result was handed to the app
 * — the caller should stop there; false means "not an app flow that supports it, exchange as usual".
 *
 * The markers are left in place on purpose: if the page's effect runs twice it hands the same
 * result over twice (the app ignores the repeat) instead of falling back to exchanging the
 * one-time code here and spending it.
 */
export function handOffOAuthCode(provider: string, body: Record<string, unknown>): boolean {
    if (!isMobileOAuthFlow()) return false;
    try { if (sessionStorage.getItem(HANDOFF_STORAGE_KEY) !== '1') return false; } catch { return false; }

    const params = new URLSearchParams({ status: 'code', provider, body: JSON.stringify(body) });
    window.location.href = `${OAUTH_APP_SCHEME}://oauth-callback?${params.toString()}`;
    return true;
}
