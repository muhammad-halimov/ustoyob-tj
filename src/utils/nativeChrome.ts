/**
 * Нативная «обвязка» пакетного приложения: масштабирование, безопасные зоны iOS и цвет статус-бара.
 * Только для мобильной сборки (импортируется из app/main.tsx и ThemeContext).
 *
 * `index.html` общий с веб-версией сайта, поэтому всё, что нужно только приложению, дописываем
 * в meta viewport в рантайме, а не там:
 *  - `maximum-scale=1, user-scalable=no` — запрет масштабирования. Главная причина: iOS
 *    автоматически приближает страницу при фокусе на поле ввода со шрифтом < 16px, и после
 *    ввода экран остаётся «зумнутым». `maximum-scale=1` убирает этот автозум, не меняя шрифты
 *    инпутов (дизайн остаётся прежним); попутно отключается и pinch-zoom. Двойной тап по
 *    кнопкам/ссылкам уже гасится `touch-action: manipulation` (см. app/styles/index.scss).
 *  - iOS: `viewport-fit=cover` — веб-вью рисуется на весь экран (Capacitor `ios.contentInset:
 *    never`, см. capacitor.config.ts), под статус-баром, Dynamic Island и «домашней полоской»;
 *    без `viewport-fit=cover` `env(safe-area-inset-*)` равен 0. Сами отступы — в
 *    app/styles/native.scss (активны под `html.native-ios`).
 */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const platform = Capacitor.getPlatform();
const isNative = Capacitor.isNativePlatform();

/** Adds `directive` (e.g. `maximum-scale=1`) to the viewport meta unless its key is already there. */
function addViewportDirective(directive: string): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const content = viewport.getAttribute('content') ?? '';
    const key = directive.split('=')[0];
    if (content.split(',').some((part) => part.trim().startsWith(`${key}=`))) return;
    viewport.setAttribute('content', `${content}, ${directive}`);
}

/** Call once at startup, before the first render. */
export function initNativeChrome(): void {
    if (!isNative) return;

    // Без автозума при фокусе на инпутах и без pinch-zoom (см. шапку файла).
    addViewportDirective('maximum-scale=1');
    addViewportDirective('user-scalable=no');

    if (platform !== 'ios') return;
    addViewportDirective('viewport-fit=cover');
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
