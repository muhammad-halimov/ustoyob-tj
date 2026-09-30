/**
 * Сессия в мобильной (Capacitor) сборке. JWT живёт час, а приложение открывают после перерыва в
 * часы и дни. Вместо сайтового setupTokenRefresh (он выходит из аккаунта, как только JWT истёк, и
 * перезагружает страницу) — тихое обновление токена по refresh-cookie (см. utils/nativeHttp.ts):
 *  - сразу при запуске, если JWT истёк или вот-вот истечёт; запросы экранов дожидаются обновления
 *    (waitForTokenRefresh в universalApiRequest) и уходят уже с новым токеном;
 *  - при возврате приложения из фона: таймеры WebView в фоне стоят;
 *  - раз в минуту, пока приложение открыто, — за 5 минут до истечения.
 * Выход — только если сервер отказал (refresh-cookie нет, истекла или отозвана). Без сети
 * пользователь остаётся в аккаунте, обновление повторится позже.
 */
import { App } from '@capacitor/app';
import { NATIVE_HTTP } from './nativeHttp';
import { getAuthToken, isTokenAboutToExpire, logout, refreshTokenOutcome } from './authUtils';

const CHECK_INTERVAL_MS = 60_000;
const REFRESH_BEFORE_MINUTES = 5;

const ensureFreshToken = async (): Promise<void> => {
    if (!getAuthToken() || !isTokenAboutToExpire(REFRESH_BEFORE_MINUTES)) return;
    if ((await refreshTokenOutcome()) !== 'rejected' || !getAuthToken()) return;
    await logout();
    window.dispatchEvent(new Event('logout'));
};

export function initNativeSession(): void {
    if (!NATIVE_HTTP) return;
    void ensureFreshToken();
    window.setInterval(() => { void ensureFreshToken(); }, CHECK_INTERVAL_MS);
    App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void ensureFreshToken();
    }).catch(() => { /* нет плагина — остаются запуск и таймер */ });
}
