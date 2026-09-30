/**
 * Нативный сплэш держится, пока главная не получила первые данные (событие `app:ready`, его шлёт
 * Category после первой загрузки) — но не дольше MAX_WAIT_MS: медленная сеть не должна держать
 * пользователя на заставке. Только мобильная сборка (импортируется из app/main.tsx).
 */
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

const MAX_WAIT_MS = 3500;

export const APP_READY_EVENT = 'app:ready';

export function initNativeSplash(): void {
    if (!Capacitor.isNativePlatform()) return;

    let hidden = false;
    const hide = () => {
        if (hidden) return;
        hidden = true;
        window.removeEventListener(APP_READY_EVENT, hide);
        // Пауза после готовности данных — иконки и шрифт успевают декодироваться под сплэшем. Только
        // setTimeout, без requestAnimationFrame: пока Android держит сплэш, WebView не рисуется, и rAF
        // может не наступить вовсе — сплэш так бы и завис.
        setTimeout(() => { void SplashScreen.hide().catch(() => {}); }, 150);
    };

    window.addEventListener(APP_READY_EVENT, hide, { once: true });
    // `app:ready` шлёт только главная; открылись не на ней (диплинк и т.п.) — ждать некого.
    setTimeout(hide, window.location.pathname === '/' ? MAX_WAIT_MS : 600);
}
