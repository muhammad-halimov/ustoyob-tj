/**
 * Ссылки «в новой вкладке» (`target="_blank"`) в приложении. В WKWebView (iOS) такие ссылки просто
 * не открываются — новых окон у веб-вью нет (так не работали «Условия использования» и «Политика
 * конфиденциальности» в плашках согласия), на Android уводят из приложения. Открываем их во встроенном
 * браузере поверх приложения (SFSafariViewController / Custom Tab): экран под ним — с введёнными
 * данными — остаётся как был, ради этого ссылки и делали «в новой вкладке». Свои страницы — с сайта
 * (в приложении адрес страницы — `capacitor://localhost` на iOS / `https://localhost` на Android) и на
 * языке приложения: `?lang=` (у встроенного браузера своё хранилище, сайт не знает выбранный здесь язык).
 */
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import i18n from 'i18next';
import { APP_WEB_ORIGIN } from './mobileOAuth';

export function initNativeLinks(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Фаза перехвата — раньше обработчика <Link> из react-router (увидев defaultPrevented, он ничего не делает).
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || !(e.target instanceof Element)) return;
        const link = e.target.closest<HTMLAnchorElement>('a[target="_blank"][href]');
        if (!link) return;
        const url = new URL(link.getAttribute('href')!, window.location.href);
        // Своя страница — та же схема и хост, что у приложения (на iOS схема не http(s), а `capacitor:`).
        const own = url.protocol === window.location.protocol && url.host === window.location.host;
        if (!own && url.protocol !== 'http:' && url.protocol !== 'https:') return; // tel:, mailto: — системе
        e.preventDefault();
        let target = url;
        if (own) {
            target = new URL(`${url.pathname}${url.search}${url.hash}`, APP_WEB_ORIGIN);
            target.searchParams.set('lang', i18n.language);
        }
        void Browser.open({ url: target.toString(), presentationStyle: 'popover' });
    }, true);
}
