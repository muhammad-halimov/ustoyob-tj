/**
 * Нативная «обвязка» пакетного приложения: безопасные зоны iOS и цвет статус-бара.
 * Только для мобильной сборки (импортируется из app/main.tsx и ThemeContext).
 *
 * iOS: веб-вью рисуется на весь экран — под статус-баром, Dynamic Island и «домашней полоской»
 * (Capacitor `ios.contentInset: never`, см. capacitor.config.ts). Чтобы `env(safe-area-inset-*)`
 * заработал, нужен `viewport-fit=cover` — добавляем его здесь, в рантайме, а не в index.html,
 * потому что index.html общий с веб-версией сайта. Сами отступы — app/styles/native.scss
 * (активны под `html.native-ios`).
 */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const platform = Capacitor.getPlatform();
const isNative = Capacitor.isNativePlatform();

/** Call once at startup, before the first render. */
export function initNativeChrome(): void {
    if (platform !== 'ios') return;

    const viewport = document.querySelector('meta[name="viewport"]');
    const content = viewport?.getAttribute('content') ?? '';
    if (viewport && !content.includes('viewport-fit')) {
        viewport.setAttribute('content', `${content}, viewport-fit=cover`);
    }
    document.documentElement.classList.add('native-ios');
}

/**
 * Красит статус-бар под тему приложения. Без этого цвет часов/индикаторов следует за СИСТЕМНОЙ
 * темой, и при ручном выборе противоположной темы они сливаются с фоном.
 * Стили: `Style.Dark` = светлый текст (для тёмного фона), `Style.Light` = тёмный текст.
 */
export function syncStatusBar(theme: 'light' | 'dark'): void {
    if (!isNative) return;

    StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => { /* не критично */ });
    // Фон статус-бара задаётся только на Android; на iOS под ним и так рисуется страница.
    if (platform === 'android') {
        StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#1a1a1a' : '#ffffff' }).catch(() => { /* не критично */ });
    }
}
