/**
 * Смотрит ли пользователь на страницу прямо сейчас: вкладка браузера видима и (в мобильном приложении)
 * приложение не свёрнуто. Нужно для отметки «прочитано»: открытый чат в фоновой вкладке или в свёрнутом
 * приложении продолжает получать сообщения через Mercure, но прочитанными их делать нельзя — их никто не
 * видел. Такие отметки откладываются до возвращения пользователя (onPageSeen).
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

let appActive = true;
const listeners = new Set<() => void>();

export const isPageSeen = (): boolean =>
    appActive && (typeof document === 'undefined' || document.visibilityState === 'visible');

const notify = (): void => {
    if (isPageSeen()) listeners.forEach(cb => cb());
};

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', notify);
if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
        appActive = isActive;
        notify();
    }).catch(() => {});
}

/** Вызвать cb каждый раз, когда страница снова оказывается перед глазами пользователя. Возвращает отписку. */
export const onPageSeen = (cb: () => void): (() => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
};
