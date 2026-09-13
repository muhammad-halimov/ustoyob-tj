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
 * tab — our own `OAuthCallbackPage`, running inside the popup, just reports the
 * result back and closes itself.
 *
 * "Am I running inside a popup we opened?" is decided via the OAuth `state`
 * param, not any window-intrinsic property. We tried `window.name` first —
 * looked promising (survives cross-window severing, unlike `window.opener`)
 * but browsers deliberately RESET `window.name` on cross-site navigation
 * (anti-fingerprinting/leak hardening) and only restore it on a plain return
 * to the exact same site — Facebook's OAuth dance hops across
 * facebook.com/m.facebook.com/etc., so it came back empty. `state` doesn't
 * have this problem: the OAuth spec requires every provider to echo it back
 * completely unchanged, so we mark it as "this run is a popup" in localStorage
 * before opening the popup, and the callback page just checks whether ITS
 * state is marked — no window property involved anywhere.
 *
 * Reporting the result back uses two independent channels once we know we're
 * in a popup:
 *  - `postMessage` to `window.opener` — instant, but some providers (observed:
 *    Facebook) serve their OAuth pages with a Cross-Origin-Opener-Policy that
 *    severs the popup's `window.opener` link the moment it navigates there,
 *    for the rest of that window's life (even after it returns to our origin).
 *  - `localStorage` + the `storage` event — origin-scoped, not window-scoped,
 *    so COOP severing an opener link doesn't touch it. This is the channel
 *    that actually has to work; postMessage is just the faster path for when
 *    the provider doesn't get in the way.
 * `window.close()` is always attempted regardless of which channel worked —
 * closing yourself is a permission tied to the window itself ("was I opened
 * by a script"), not to whether `window.opener` is still reachable.
 */

export const OAUTH_POPUP_MESSAGE_SOURCE = 'oauth-popup' as const;
const POPUP_FLOW_STORAGE_PREFIX = 'oauth_popup_flow_';
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
 * Call once the real authorize URL (and its `state` param) is known, right
 * before navigating the popup there. Marks that `state` as belonging to a
 * popup flow so the callback page — however it gets there, on whatever
 * window — knows to report back instead of navigating normally.
 */
export function markOAuthPopupFlow(state: string): void {
    try { localStorage.setItem(POPUP_FLOW_STORAGE_PREFIX + state, '1'); } catch { /* private mode / storage disabled — falls back to a normal navigate on completion */ }
}

function consumeOAuthPopupFlow(state: string | null | undefined): boolean {
    if (!state) return false;
    const key = POPUP_FLOW_STORAGE_PREFIX + state;
    let flagged = false;
    try { flagged = localStorage.getItem(key) !== null; } catch { /* ignore */ }
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return flagged;
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

        // Резервный (а на практике часто единственный рабочий) канал —
        // localStorage. Не зависит от window.opener вообще, поэтому его не
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
            // к окну — одно из немногих кросс-origin свойств, которые остаются
            // доступны в любом случае.
            let closed = false;
            try { closed = popup.closed; } catch { closed = true; }
            if (!closed) return;

            window.clearInterval(pollTimer);
            // finishOAuthPopup пишет сигнал (localStorage/postMessage) и закрывает
            // окно одним синхронным блоком — а popup только что мог быть на чужом
            // origin (другой процесс у браузера), так что доставка storage/message
            // сюда не мгновенна. Без этой паузы опрос иногда замечал закрытие
            // РАНЬШЕ, чем долетал сигнал, и настоящий успех (например у Facebook)
            // принимался за ручное закрытие пользователем.
            setTimeout(() => {
                if (settled) return;
                cleanup();
                reject(new Error('popup_closed'));
            }, 300);
        }, 500);

        window.addEventListener('message', onMessage);
        window.addEventListener('storage', onStorage);
    });
}

/**
 * Call from inside the callback page with the `state` param it was given.
 * If that state was marked by `markOAuthPopupFlow` (i.e. we really are inside
 * a popup we opened, on whatever window that turned out to be), reports the
 * result back to the opening tab (via both channels — see file header) and
 * closes this window. Returns false (does nothing) when the state isn't
 * marked — e.g. the callback URL was opened directly / navigated to normally
 * — so the caller can fall back to its regular navigate()-based behavior.
 */
export function finishOAuthPopup(state: string | null | undefined, result: Omit<OAuthPopupResult, 'source'>): boolean {
    if (!consumeOAuthPopupFlow(state)) return false;

    const message: OAuthPopupResult = { source: OAUTH_POPUP_MESSAGE_SOURCE, ...result } as OAuthPopupResult;

    try {
        // ts — не для чтения, а чтобы значение ГАРАНТИРОВАННО отличалось от
        // прошлого раза. Без него два одинаковых успешных входа подряд пишут
        // побайтово идентичную строку — а браузер не генерирует событие
        // `storage`, если новое значение равно старому. Именно это молча душило
        // сигнал при повторном тестировании: opener просто никогда не узнавал.
        localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({ ...message, ts: Date.now() }));
    } catch { /* private mode / storage disabled — postMessage below is our other shot */ }

    if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage(message, window.location.origin); } catch { /* COOP-severed — localStorage above already covers it */ }
    }

    // window.close() закрывает именно ЭТО окно — это разрешение живёт на самом
    // окне (было открыто скриптом или нет), а не на связи с opener'ом, поэтому
    // в теории работает даже когда opener уже недоступен из-за COOP. На практике
    // некоторые браузеры молча отказывают в close() окну, которое успело
    // сходить на чужой origin (facebook.com и обратно) — трюк с window.open('',
    // '_self') перед close() восстанавливает у окна статус "открыто скриптом" и
    // существенно повышает шанс, что закрытие реально пройдёт.
    try {
        window.open('', '_self');
        window.close();
    } catch { /* браузер всё равно отказал — не критично, opener сам разберётся по сигналу выше */ }
    return true;
}
