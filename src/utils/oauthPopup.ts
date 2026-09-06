/**
 * Shared plumbing for running Google/Facebook/Instagram OAuth in a popup window
 * instead of a full top-level redirect (`window.location.href`).
 *
 * A full-page redirect to the provider's authorize URL is exactly what lets the
 * mobile OS intercept the navigation (Universal Links / App Links) and hand the
 * whole flow off to the provider's native app instead of showing it in-browser —
 * and once that happens, coming back to our tab isn't reliably in our control.
 * A popup doesn't eliminate that OS-level interception outright (still their
 * call, not ours), but it does keep OUR tab alive and in place the whole time,
 * so we don't depend on the provider handing navigation back to the exact same
 * tab — our own `OAuthCallbackPage`, running inside the popup, just posts the
 * result back via `postMessage` and closes itself.
 */

export const OAUTH_POPUP_MESSAGE_SOURCE = 'oauth-popup' as const;

export type OAuthPopupResult =
    | { source: typeof OAUTH_POPUP_MESSAGE_SOURCE; status: 'success' }
    | { source: typeof OAUTH_POPUP_MESSAGE_SOURCE; status: 'error'; message?: string };

/**
 * Opens a blank popup window synchronously — call this directly inside the
 * click handler, BEFORE any `await`/`.then()`. Popup blockers (Safari in
 * particular) only allow `window.open` while it's still tied to the user
 * gesture; by the time an async request for the real authorize URL resolves,
 * that gesture has "gone cold" and the popup would get silently blocked.
 * Once the real URL is known, navigate this same window with `navigateOAuthPopup`.
 */
export function openOAuthPopup(name: string): Window | null {
    const width = 480;
    const height = 680;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`;
    try {
        return window.open('about:blank', name, features);
    } catch {
        return null;
    }
}

/** Navigates an already-open popup (see `openOAuthPopup`) to the real authorize URL. */
export function navigateOAuthPopup(popup: Window, url: string): void {
    popup.location.href = url;
}

/**
 * Resolves once the popup (our own callback page, running same-origin inside
 * it) posts a success result back, or rejects if it posts an error, or if the
 * user closes the popup manually before either happens (`Error('popup_closed')`).
 */
export function waitForOAuthPopupResult(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            window.clearInterval(pollTimer);
        };

        const onMessage = (event: MessageEvent) => {
            // event.source lets us ignore messages from any other same-origin
            // tab/iframe that happens to post something at the same time.
            if (event.source !== popup || event.origin !== window.location.origin) return;
            const data = event.data as OAuthPopupResult | undefined;
            if (!data || data.source !== OAUTH_POPUP_MESSAGE_SOURCE) return;

            settled = true;
            cleanup();
            try { popup.close(); } catch { /* already closed */ }

            if (data.status === 'success') resolve();
            else reject(new Error(data.message || 'oauth_failed'));
        };

        const pollTimer = window.setInterval(() => {
            if (popup.closed) {
                cleanup();
                if (!settled) reject(new Error('popup_closed'));
            }
        }, 500);

        window.addEventListener('message', onMessage);
    });
}

/**
 * Call from inside the callback page when it might be running inside a popup
 * we opened (`window.opener` set). Posts the result to the opener and closes
 * this window. Returns false (does nothing) when there's no opener to talk to
 * — e.g. the callback URL was opened directly / navigated to normally — so the
 * caller can fall back to its regular navigate()-based behavior.
 */
export function finishOAuthPopup(result: Omit<OAuthPopupResult, 'source'>): boolean {
    if (!window.opener || window.opener.closed) return false;
    try {
        window.opener.postMessage({ source: OAUTH_POPUP_MESSAGE_SOURCE, ...result } as OAuthPopupResult, window.location.origin);
    } catch {
        return false;
    }
    try { window.close(); } catch { /* some browsers refuse to close non-script-opened tabs */ }
    return true;
}
