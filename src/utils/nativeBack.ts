/**
 * Системная «назад» в мобильной сборке (кнопка и жест Android) — как в нативных приложениях: сначала
 * закрывается то, что открыто поверх экрана (меню, галерея фото, модалка, переписка в чатах на
 * телефоне), и только потом — переход на предыдущий экран; на первом экране приложение сворачивается.
 *
 * Раньше «назад» всегда уходил на предыдущий адрес: открытая галерея оставалась висеть поверх другой
 * страницы, а из переписки вместо списка чатов возвращало на прошлый экран. С подпиской на
 * `backButton` Capacitor сам назад больше не уходит — всё решается здесь. Компоненты не меняются:
 * закрываем так же, как закрыл бы пользователь (кнопка закрытия, тап мимо, Escape).
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const isShown = (el: Element): boolean => {
    if (el.closest('[data-native-ghost]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
};
const topmost = (selector: string): HTMLElement | null => {
    const found = [...document.querySelectorAll<HTMLElement>(selector)].filter(isShown);
    return found[found.length - 1] ?? null;
};

/** Меню «⋮», выпадающие списки, выбор языка. */
const closeMenu = (): boolean => {
    const lang = topmost('[class*="_language_dropdown_"]');
    if (lang) {
        // Список языков закрывается только своей кнопкой.
        lang.closest<HTMLElement>('[class*="_rightPart_lang__box_"]')?.click();
        return true;
    }
    if (!topmost('[data-actions-dropdown-portal], [class*="_dropdown_"][role="listbox"]')) return false;
    // Эти закрываются касанием мимо (mousedown вне себя) и Escape.
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return true;
};

/** Галерея фото и модалки: кнопка закрытия, иначе тап по подложке. */
const closeOverlay = (): boolean => {
    const overlay = topmost('[class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"], [class*="_modalOverlay_"]');
    if (!overlay) return false;
    const closeButton = [...overlay.querySelectorAll<HTMLElement>('button')].find((b) =>
        /close|закры|пӯшид/i.test(`${b.className} ${b.getAttribute('aria-label') ?? ''}`) && isShown(b));
    if (closeButton) closeButton.click();
    else overlay.click();
    return true;
};

/** Открытая переписка на телефоне — назад к списку чатов (тем же событием, что кнопка «Чаты»). */
const closeConversation = (): boolean => {
    if (window.location.pathname.replace(/\/+$/, '') !== '/chats' || !document.querySelector('[class*="_chatAreaActive_"]')) return false;
    window.dispatchEvent(new Event('chat:closeActive'));
    return true;
};

export function initNativeBackButton(): void {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    App.addListener('backButton', ({ canGoBack }) => {
        if (closeMenu() || closeOverlay() || closeConversation()) return;
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
    }).catch(() => { /* без плагина — поведение Capacitor по умолчанию */ });
}
