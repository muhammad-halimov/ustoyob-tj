/**
 * Ссылки «в новой вкладке» (`target="_blank"`) в приложении. В WKWebView (iOS) такие ссылки просто
 * не открываются — новых окон у веб-вью нет (так не работали «Условия использования» и «Политика
 * конфиденциальности» в плашках согласия), на Android уводят из приложения. Открываем их во встроенном
 * браузере поверх приложения (SFSafariViewController / Custom Tab): экран под ним — с введёнными
 * данными — остаётся как был, ради этого ссылки и делали «в новой вкладке». Свои страницы — с сайта:
 * в приложении адрес страницы — `capacitor://localhost` (iOS) / `https://localhost` (Android).
 */
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { APP_WEB_ORIGIN } from './mobileOAuth';

export function initNativeLinks(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Фаза перехвата — раньше обработчика <Link> из react-router (увидев defaultPrevented, он ничего не делает).
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || !(e.target instanceof Element)) return;
        const link = e.target.closest<HTMLAnchorElement>('a[target="_blank"][href]');
        if (!link) return;
        const url = new URL(link.getAttribute('href')!, window.location.href);
        // Сравниваем схему и хост, а не origin: у `capacitor://` (нестандартная схема) origin — "null".
        const own = url.protocol === window.location.protocol && url.host === window.location.host;
        if (!own && url.protocol !== 'http:' && url.protocol !== 'https:') return; // tel:, mailto: — системе
        e.preventDefault();
        const target = own ? new URL(`${url.pathname}${url.search}${url.hash}`, APP_WEB_ORIGIN).toString() : url.toString();
        void Browser.open({ url: target, presentationStyle: 'popover' });
    }, true);
}
