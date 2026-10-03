/**
 * Ссылки в приложении. Только мобильная сборка.
 *
 *  - Ссылок как таковых (`<a href>`) в приложении нет: долгое нажатие на ссылку в Android WebView показывает
 *    системную плашку «название + адрес» (https://localhost/chats), и ни contextmenu, ни CSS на неё не
 *    действуют. Поэтому адрес у каждой ссылки сразу переносится из `href` в `data-native-href` (и у
 *    появившихся позже — их ловит MutationObserver): без `href` это уже не ссылка, плашке показывать нечего.
 *    Переходы по `<Link>` от `href` не зависят — их ведёт обработчик клика react-router. Остальные ссылки
 *    (обычные `<a>`, ссылки в тексте) открываются отсюда, по клику.
 *  - Ссылки «в новой вкладке» (`target="_blank"`). В WKWebView (iOS) такие ссылки просто не открываются —
 *    новых окон у веб-вью нет (так не работали «Условия использования» и «Политика конфиденциальности» в
 *    плашках согласия), на Android уводят из приложения.
 *      - Свои страницы открываются внутри приложения обычным переходом, как любая другая страница. «В новой
 *        вкладке» их делали, чтобы не потерять введённое в форме под ссылкой: здесь это и так не теряется —
 *        вкладки нижней панели (плашки согласия сейчас только в профиле) не размонтируются при уходе с них
 *        (TabKeepAlive). Со страницы не из нижней панели такая ссылка открывается во встроенном браузере
 *        поверх приложения — эту страницу переход размонтировал бы вместе с введённым.
 *  - Чужие ссылки — во встроенном браузере (SFSafariViewController / Custom Tab); tel:, mailto: — системе.
 */
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import i18n from 'i18next';
import type { createBrowserRouter } from 'react-router-dom';
import { APP_WEB_ORIGIN } from './mobileOAuth';
import { isKeepAliveTab } from '../app/layouts/keepAliveTabs';

type AppRouter = ReturnType<typeof createBrowserRouter>;

/** Куда перенесён адрес ссылки (см. описание модуля). */
export const NATIVE_HREF = 'data-native-href';

const stripHref = (link: Element): void => {
    const href = link.getAttribute('href');
    if (href === null) return;
    link.setAttribute(NATIVE_HREF, href);
    link.removeAttribute('href');
};

const stripAll = (root: Element | Document): void => {
    if (root instanceof Element && root.tagName.toLowerCase() === 'a') stripHref(root);
    root.querySelectorAll('a[href]').forEach(stripHref);
};

export function installNativeLinks(router: AppRouter): void {
    if (!Capacitor.isNativePlatform()) return;

    stripAll(document);
    // React ставит href при монтировании ссылки и заново — только если сменился адрес (`to`).
    new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === 'attributes') {
                if (r.target instanceof Element) stripHref(r.target);
                continue;
            }
            r.addedNodes.forEach((node) => { if (node instanceof Element) stripAll(node); });
        }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

    const open = (href: string, newTab: boolean): void => {
        const url = new URL(href, window.location.href);
        // Своя страница — та же схема и хост, что у приложения (на iOS схема не http(s), а `capacitor:`).
        const own = url.protocol === window.location.protocol && url.host === window.location.host;
        const path = `${url.pathname}${url.search}${url.hash}`;
        if (own && (!newTab || isKeepAliveTab(router.state.location.pathname))) {
            void router.navigate(path);
            return;
        }
        if (own) {
            // Сайт во встроенном браузере не знает язык приложения (своё хранилище) — передаём явно.
            const target = new URL(path, APP_WEB_ORIGIN);
            target.searchParams.set('lang', i18n.language);
            void Browser.open({ url: target.toString(), presentationStyle: 'popover' });
            return;
        }
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            void Browser.open({ url: url.toString(), presentationStyle: 'popover' });
            return;
        }
        window.location.href = url.toString(); // tel:, mailto: — системе
    };

    const linkOf = (e: MouseEvent, selector: string): { link: Element; href: string } | null => {
        if (e.defaultPrevented || e.button !== 0 || !(e.target instanceof Element)) return null;
        const link = e.target.closest(selector);
        const href = link?.getAttribute(NATIVE_HREF) ?? link?.getAttribute('href');
        return link && href ? { link, href } : null;
    };

    // «В новой вкладке» — в фазе перехвата, раньше обработчика <Link> из react-router (увидев
    // defaultPrevented, он ничего не делает).
    document.addEventListener('click', (e) => {
        const hit = linkOf(e, `a[target="_blank"][${NATIVE_HREF}], a[target="_blank"][href]`);
        if (!hit) return;
        e.preventDefault();
        open(hit.href, true);
    }, true);

    // Остальные — после всех обработчиков: переход, который уже сделал <Link> (defaultPrevented), не повторяем.
    document.addEventListener('click', (e) => {
        const hit = linkOf(e, `a[${NATIVE_HREF}]`);
        if (!hit) return;
        e.preventDefault();
        open(hit.href, false);
    });
}
