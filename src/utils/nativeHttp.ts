/**
 * Нативные HTTP-запросы для входа, обновления токена и выхода — только мобильная (Capacitor)
 * сборка; на сайте NATIVE_HTTP = false, и authFetch — обычный fetch.
 *
 * Зачем: refresh-токен бэкенд отдаёт только в cookie `refresh_token` (HttpOnly, Secure,
 * SameSite=Strict, 15 дней), а сам JWT живёт час. Приложение открыто на https://localhost, API —
 * на https://ustoyob.tj: для WebView это межсайтовые запросы, и такую cookie он не сохраняет и не
 * отправляет. /api/refresh_token из WebView всегда получал 401, и через час после входа (или при
 * первом запуске после перерыва) пользователя выбрасывало из аккаунта.
 *
 * Нативный запрос (CapacitorHttp: HttpURLConnection на Android, URLSession на iOS) идёт мимо
 * WebView: cookie из ответа попадает в нативное хранилище приложения, переживает перезапуск и
 * уходит со следующими нативными запросами на тот же домен — ограничений SameSite там нет. Поэтому
 * нативно отправляются только запросы, которые ставят, читают или стирают эту cookie: вход (пароль
 * и колбэки OAuth — см. universalApiRequest), обновление токена и выход (см. authUtils). Остальное
 * API — по-прежнему fetch из WebView.
 */
import { Capacitor, CapacitorCookies, CapacitorHttp } from '@capacitor/core';

export const NATIVE_HTTP = Capacitor.isNativePlatform();

const REFRESH_COOKIE = 'refresh_token';

// Статусы, у которых по стандарту Fetch не бывает тела: new Response с телом на них бросает.
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

const toHeaderRecord = (headers: HeadersInit | undefined): Record<string, string> => {
    if (!headers) return {};
    if (headers instanceof Headers || Array.isArray(headers)) {
        const out: Record<string, string> = {};
        new Headers(headers).forEach((value, key) => { out[key] = value; });
        return out;
    }
    return { ...headers };
};

/**
 * fetch поверх CapacitorHttp для JSON-запросов: тело — строка или его нет. signal и keepalive не
 * поддерживаются — нативный запрос просто доходит до конца. Ошибка сети — исключение, как у fetch.
 */
export const nativeFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    if (init.body != null && typeof init.body !== 'string') {
        throw new TypeError('nativeFetch: supports string bodies only');
    }
    const res = await CapacitorHttp.request({
        url,
        method: init.method ?? 'GET',
        headers: toHeaderRecord(init.headers),
        data: init.body ?? undefined,
        responseType: 'text',
        connectTimeout: 15_000,
        readTimeout: 20_000,
    });
    // JSON-ответ CapacitorHttp отдаёт уже разобранным, остальное — строкой.
    const text = res.data == null ? '' : typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const headers = new Headers();
    for (const [key, value] of Object.entries(res.headers ?? {})) {
        // Set-Cookie уже разобрало нативное хранилище cookie; refresh-токену в JS делать нечего.
        if (!key || /^set-cookie2?$/i.test(key)) continue;
        try { headers.append(key, String(value)); } catch { /* недопустимое для Headers имя или значение */ }
    }
    return new Response(NULL_BODY_STATUSES.has(res.status) ? null : text, { status: res.status, headers });
};

/** fetch для запросов, завязанных на refresh-cookie: в мобильной сборке — нативный, на сайте — обычный. */
export const authFetch = (url: string, init: RequestInit = {}): Promise<Response> =>
    NATIVE_HTTP ? nativeFetch(url, init) : fetch(url, init);

/**
 * Стереть refresh-cookie из нативного хранилища (при выходе). Сервер стирает её и сам в ответе на
 * /api/invalidate_token, но этот запрос мог не дойти — например, без сети. Второй вызов — копия,
 * которую Capacitor дублирует на адрес самого приложения (https://localhost).
 */
export const clearNativeRefreshCookie = async (apiOrigin: string): Promise<void> => {
    if (!NATIVE_HTTP) return;
    await CapacitorCookies.deleteCookie({ url: apiOrigin, key: REFRESH_COOKIE }).catch(() => {});
    await CapacitorCookies.deleteCookie({ key: REFRESH_COOKIE }).catch(() => {});
};
