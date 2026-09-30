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
        // Два кадра + запас: React уже отдал разметку, но иконки категорий и шрифт ещё декодируются —
        // без паузы под сплэшем открывались заглушки-блюрхеши.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            setTimeout(() => { void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}); }, 150);
        }));
    };

    window.addEventListener(APP_READY_EVENT, hide, { once: true });
    setTimeout(hide, MAX_WAIT_MS);
}
