/**
 * Ссылки «в новой вкладке» (`target="_blank"`) в приложении. В WKWebView (iOS) такие ссылки просто
 * не открываются — новых окон у веб-вью нет (так не работали «Условия использования» и «Политика
 * конфиденциальности» в плашках согласия), на Android уводят из приложения.
 *
 *  - Свои страницы открываются внутри приложения обычным переходом, как любая другая страница. «В новой
 *    вкладке» их делали, чтобы не потерять введённое в форме под ссылкой: здесь это и так не теряется —
 *    вкладки нижней панели (плашки согласия сейчас только в профиле) не размонтируются при уходе с них
 *    (TabKeepAlive). Со страницы не из нижней панели такая ссылка открывается во встроенном браузере
 *    поверх приложения — эту страницу переход размонтировал бы вместе с введённым.
 *  - Чужие ссылки — во встроенном браузере (SFSafariViewController / Custom Tab).
 */
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import i18n from 'i18next';
import type { createBrowserRouter } from 'react-router-dom';
import { APP_WEB_ORIGIN } from './mobileOAuth';
import { isKeepAliveTab } from '../app/layouts/keepAliveTabs';

type AppRouter = ReturnType<typeof createBrowserRouter>;

export function installNativeLinks(router: AppRouter): void {
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
        if (own && isKeepAliveTab(router.state.location.pathname)) {
            void router.navigate(`${url.pathname}${url.search}${url.hash}`);
            return;
        }
        let target = url;
        if (own) {
            // Сайт во встроенном браузере не знает язык приложения (своё хранилище) — передаём явно.
            target = new URL(`${url.pathname}${url.search}${url.hash}`, APP_WEB_ORIGIN);
            target.searchParams.set('lang', i18n.language);
        }
        void Browser.open({ url: target.toString(), presentationStyle: 'popover' });
    }, true);
}
