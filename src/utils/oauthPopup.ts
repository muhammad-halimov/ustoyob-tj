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
 * result back and closes itself.
 *
 * Two independent signalling channels, not one:
 *  - `postMessage` to `window.opener` — instant, but some providers (observed:
 *    Facebook) serve their OAuth pages with a Cross-Origin-Opener-Policy that
 *    severs the popup's `window.opener` link the moment it navigates there.
 *    Once that happens it's gone for the rest of that window's life, even
 *    after it comes back to our own origin — postMessage to a severed opener
 *    just silently goes nowhere.
 *  - `localStorage` + the `storage` event — origin-scoped, not window-scoped,
 *    so COOP severing an opener link doesn't touch it at all. This is the
 *    channel that actually has to work; postMessage is just the faster path
 *    when the provider doesn't get in the way.
 * `window.name` is used (not `window.opener`) to detect "am I one of our own
 * popups" in `finishOAuthPopup`, because — like localStorage — it survives
 * COOP severing (it's intrinsic to the window itself, not a cross-window
 * reference), whereas `window.opener` is exactly what might already be gone.
 */

export const OAUTH_POPUP_MESSAGE_SOURCE = 'oauth-popup' as const;
const OAUTH_POPUP_NAME_PREFIX = 'oauth_popup:';
const RESULT_STORAGE_KEY = 'oauth_popup_result';

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
        return window.open('about:blank', `${OAUTH_POPUP_NAME_PREFIX}${name}`, features);
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
 * it) reports a success result back, or rejects if it reports an error, or if
 * the user closes the popup manually before either happens
 * (`Error('popup_closed')`).
 */
export function waitForOAuthPopupResult(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (data: OAuthPopupResult) => {
            if (settled) return;
            settled = true;
            cleanup();
            try { popup.close(); } catch { /* already closed, or COOP-severed — either way nothing to do */ }
            if (data.status === 'success') resolve();
            else reject(new Error(data.message || 'oauth_failed'));
        };

        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data as OAuthPopupResult | undefined;
            if (!data || data.source !== OAUTH_POPUP_MESSAGE_SOURCE) return;
            finish(data);
        };

        // Резервный (а на деле часто единственный рабочий) канал — localStorage.
        // Не зависит от window.opener/window.source вообще, поэтому его не
        // трогает COOP на странице провайдера (см. комментарий в шапке файла).
        const onStorage = (event: StorageEvent) => {
            if (event.key !== RESULT_STORAGE_KEY || !event.newValue) return;
            try {
                const data = JSON.parse(event.newValue) as OAuthPopupResult;
                if (data.source !== OAUTH_POPUP_MESSAGE_SOURCE) return;
                finish(data);
            } catch { /* ignore malformed value */ }
        };

        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            window.removeEventListener('storage', onStorage);
            window.clearInterval(pollTimer);
        };

        const pollTimer = window.setInterval(() => {
            // .closed остаётся читаемым даже когда COOP разорвал остальной доступ
            // к окну — один из немногих кросс-origin свойств, которые остаются
            // доступны в любом случае.
            let closed = false;
            try { closed = popup.closed; } catch { closed = true; }
            if (closed) {
                cleanup();
                if (!settled) reject(new Error('popup_closed'));
            }
        }, 500);

        window.addEventListener('message', onMessage);
        window.addEventListener('storage', onStorage);
    });
}

/**
 * Call from inside the callback page when it might be running inside a popup
 * we opened. Reports the result back to the opening tab (via both channels —
 * see file header) and closes this window. Returns false (does nothing) when
 * this isn't one of our popups at all — e.g. the callback URL was opened
 * directly / navigated to normally — so the caller can fall back to its
 * regular navigate()-based behavior.
 */
export function finishOAuthPopup(result: Omit<OAuthPopupResult, 'source'>): boolean {
    if (!window.name.startsWith(OAUTH_POPUP_NAME_PREFIX)) return false;

    const message: OAuthPopupResult = { source: OAUTH_POPUP_MESSAGE_SOURCE, ...result } as OAuthPopupResult;

    try {
        localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(message));
    } catch { /* private mode / storage disabled — postMessage below is our other shot */ }

    if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage(message, window.location.origin); } catch { /* COOP-severed — localStorage above already covers it */ }
    }

    // window.close() закрывает именно ЭТО окно — это разрешение живёт на самом
    // окне (было открыто скриптом или нет), а не на связи с opener'ом, поэтому
    // работает даже когда opener уже недоступен из-за COOP.
    try { window.close(); } catch { /* браузер отказал — маловероятно, но не критично */ }
    return true;
}
