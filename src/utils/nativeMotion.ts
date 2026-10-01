/**
 * Анимации мобильной сборки — как в нативном приложении, а не как на сайте. Работают только в
 * Capacitor (`html.native`), сайт этот модуль не задевает. Сами анимации — app/styles/native-motion.scss,
 * здесь — когда и в какую сторону их запускать:
 *
 *  - Переходы между экранами — View Transitions API: браузер снимает старый и новый экран и анимирует
 *    снимки, двух живых деревьев React не нужно. Вперёд/назад — горизонтально (Android: Material
 *    shared axis, iOS: «пуш» со сдвигом подложки), смена вкладки нижней панели — fade through.
 *    Направление — класс на <html> (vt-forward / vt-back / vt-tab). Нижняя панель в переходе стоит на месте.
 *  - Модалки, меню, выпадающие списки, галерея: появление — CSS-анимацией; исчезновение — «призраком»:
 *    узел, который React уже удалил, клонируется и доигрывает анимацию ухода. Компоненты не меняются.
 *  - Нажатие: элемент слегка «вдавливается» и тускнеет (Web Animations — не CSS transition, чтобы не
 *    перебивать собственные transition компонентов), с короткой задержкой и отменой при прокрутке,
 *    как в нативных списках.
 */
import { Capacitor } from '@capacitor/core';
import { flushSync } from 'react-dom';
import type { createBrowserRouter } from 'react-router-dom';
import { TAB_PATHS } from '../app/layouts/keepAliveTabs';

type AppRouter = ReturnType<typeof createBrowserRouter>;
type Place = { pathname: string; search: string };
/** forward/back — переход между экранами, tab — смена вкладки нижней панели, fade — смена вида внутри экрана. */
export type NativeMotion = 'forward' | 'back' | 'tab' | 'fade' | 'none';

const ENABLED = Capacitor.isNativePlatform();
const VT_SUPPORTED = typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const normalize = (pathname: string): string => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);
const isTab = (pathname: string): boolean => TAB_PATHS.includes(normalize(pathname));
// Внутри одного экрана «вперёд» — только открытие подробности (обращение в ТП, `?ticket=`); прочие
// параметры (фильтры, вкладки) меняются без анимации.
const opensDetail = (search: string): boolean => new URLSearchParams(search).has('ticket');

const pushMotion = (from: Place, to: Place): NativeMotion => {
    if (normalize(from.pathname) === normalize(to.pathname)) {
        if (!opensDetail(from.search) && opensDetail(to.search)) return 'forward';
        if (opensDetail(from.search) && !opensDetail(to.search)) return 'back';
        return 'none';
    }
    return isTab(to.pathname) ? 'tab' : 'forward';
};

const popMotion = (from: Place, to: Place): NativeMotion => {
    if (normalize(from.pathname) === normalize(to.pathname)) {
        return opensDetail(from.search) !== opensDetail(to.search) ? 'back' : 'none';
    }
    return isTab(from.pathname) && isTab(to.pathname) ? 'tab' : 'back';
};

export const setNativeMotion = (motion: NativeMotion): void => {
    const classes = document.documentElement.classList;
    classes.remove('vt-forward', 'vt-back', 'vt-tab', 'vt-fade');
    if (motion !== 'none') classes.add(`vt-${motion}`);
};

/** Куда ведёт `to` из router.navigate — приблизительно, только чтобы выбрать анимацию. */
const resolvePlace = (to: unknown, current: Place): Place | null => {
    if (to == null) return current;
    if (typeof to === 'string') {
        if (to.startsWith('?')) return { pathname: current.pathname, search: to };
        if (to.startsWith('#')) return current;
        const url = new URL(to, `${window.location.origin}${current.pathname.replace(/\/?$/, '/')}`);
        return { pathname: url.pathname, search: url.search };
    }
    if (typeof to === 'object') {
        const t = to as { pathname?: string; search?: string };
        return { pathname: t.pathname ?? current.pathname, search: t.search ?? '' };
    }
    return null;
};

/**
 * Переходы между экранами для всего приложения: все навигации идут через router.navigate (Link,
 * useNavigate, setSearchParams), так что достаточно добавить им `viewTransition` здесь. Возврат
 * (системная «назад», navigate(-1)) react-router анимирует сам — туда, куда пришли с переходом;
 * направление для любой навигации выставляет подписка ниже, до старта перехода.
 */
export function installNativePageTransitions(router: AppRouter): void {
    if (!ENABLED || !VT_SUPPORTED) return;
    // Прокрутку восстанавливает само приложение (TabKeepAlive, Layout). Браузерное восстановление на
    // «назад» прокручивало ещё СТАРЫЙ экран до снимка — в переходе мелькал не тот кусок страницы.
    window.history.scrollRestoration = 'manual';
    let current: Place = { pathname: router.state.location.pathname, search: router.state.location.search };
    let currentKey = router.state.location.key;

    // Подписка раньше RouterProvider'а — класс направления стоит до того, как он запустит переход.
    router.subscribe((state) => {
        if (state.location.key === currentKey) return;
        const next: Place = { pathname: state.location.pathname, search: state.location.search };
        const motion: NativeMotion = reducedMotion() ? 'none'
            : state.historyAction === 'POP' ? popMotion(current, next)
            : state.historyAction === 'REPLACE' ? 'none'
            : pushMotion(current, next);
        setNativeMotion(motion);
        current = next;
        currentKey = state.location.key;
    });

    const navigate = router.navigate.bind(router);
    router.navigate = ((to: unknown, opts?: Record<string, unknown>) => {
        if (typeof to === 'number' || reducedMotion()) return navigate(to as never, opts as never);
        const target = resolvePlace(to, current);
        const animate = !opts?.replace && target !== null && pushMotion(current, target) !== 'none';
        return navigate(to as never, (animate ? { ...opts, viewTransition: true } : opts) as never);
    }) as AppRouter['navigate'];
}

/**
 * Анимированная смена вида без смены адреса (например, список чатов → переписка на телефоне):
 * тот же переход, что между экранами. Обновление применяется синхронно внутри перехода.
 */
export function runNativeTransition(motion: NativeMotion, update: () => void): void {
    if (!ENABLED || !VT_SUPPORTED || motion === 'none' || reducedMotion()) {
        update();
        return;
    }
    setNativeMotion(motion);
    document.startViewTransition(() => { flushSync(update); });
}

// ── Исчезновение модалок, меню, списков: «призраки» ─────────────────────────────────────────────

type GhostKind = 'dialog' | 'gallery' | 'menu' | 'listbox';
const GHOSTS: { selector: string; kind: GhostKind; ms: number; inPlace?: boolean }[] = [
    { selector: '[class*="_modalOverlay_"]', kind: 'dialog', ms: 190 },
    { selector: '[class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"]', kind: 'gallery', ms: 200 },
    { selector: '[data-actions-dropdown-portal]', kind: 'menu', ms: 150 },
    // Выпадающий список позиционирован внутри своего поля — призрак остаётся там же, и только если
    // закрылся сам список, а не всё поле.
    { selector: '[class*="_dropdown_"][role="listbox"]', kind: 'listbox', ms: 140, inPlace: true },
];

const spawnGhost = (node: Element, kind: GhostKind, ms: number, parent: Node | null, before: Node | null): void => {
    const ghost = node.cloneNode(true) as HTMLElement;
    // Клон берёт атрибуты, а не набранный текст — переносим значения полей.
    const fields = node.querySelectorAll<HTMLInputElement>('input, textarea, select');
    const copies = ghost.querySelectorAll<HTMLInputElement>('input, textarea, select');
    fields.forEach((field, i) => { if (copies[i]) copies[i].value = field.value; });
    ghost.setAttribute('data-native-ghost', kind);
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    const host = parent ?? document.body;
    host.insertBefore(ghost, before && before.parentNode === host ? before : null);
    // Убираем по окончании собственной анимации призрака; таймер — страховка, если анимации не было.
    const remove = (): void => ghost.remove();
    ghost.addEventListener('animationend', (e) => { if (e.target === ghost) remove(); });
    window.setTimeout(remove, ms * 3 + 200);
};

const initOverlayGhosts = (): void => {
    new MutationObserver((records) => {
        if (reducedMotion()) return;
        for (const record of records) {
            record.removedNodes.forEach((removed) => {
                if (!(removed instanceof Element) || removed.hasAttribute('data-native-ghost')) return;
                for (const { selector, kind, ms, inPlace } of GHOSTS) {
                    if (removed.matches(selector)) {
                        const parent = inPlace ? (record.target.isConnected ? record.target : null) : document.body;
                        if (inPlace && !parent) continue;
                        spawnGhost(removed, kind, ms, parent, inPlace ? record.nextSibling : null);
                    } else if (!inPlace) {
                        removed.querySelectorAll(selector).forEach((el) => spawnGhost(el, kind, ms, document.body, null));
                    }
                }
            });
        }
    }).observe(document.body, { childList: true, subtree: true });
};

// ── Нажатие ─────────────────────────────────────────────────────────────────────────────────────

const PRESS_DELAY_MS = 50;
const PRESS_IN_MS = 110;
const MOVE_CANCEL_PX = 10;
const BUTTONISH = 'button, a[href], [role="button"], [role="tab"], [role="option"], label[for], summary';
const NOT_PRESSABLE = 'input, textarea, select, [contenteditable="true"], [data-native-ghost], [class*="_mobile_header_"]';
// Выше этих контейнеров не поднимаемся: подложка модалки или галереи — не кнопка, даже с cursor: pointer.
const PRESS_BOUNDARY = '[class*="_modalOverlay_"], [class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"], main';

/**
 * Что «вдавить» при касании: ближайшая кнопка/ссылка, иначе блок с cursor: pointer (карточки, строки,
 * плитки). cursor наследуется — поднимаемся до элемента, который его задал (у родителя он уже другой),
 * иначе вдавливался бы текст внутри карточки, а не сама карточка.
 */
const findPressable = (target: Element): HTMLElement | null => {
    if (target.closest(NOT_PRESSABLE)) return null;
    const boundary = target.closest(PRESS_BOUNDARY);
    let el: Element | null = target.closest(BUTTONISH);
    if (el && boundary && !boundary.contains(el)) el = null;
    if (!el) {
        let cur: Element | null = target;
        while (cur && cur !== boundary && cur !== document.body && getComputedStyle(cur).cursor !== 'pointer') cur = cur.parentElement;
        if (!cur || cur === boundary || cur === document.body) return null;
        let parent: Element | null = cur.parentElement;
        while (parent && parent !== boundary && parent !== document.body && getComputedStyle(parent).cursor === 'pointer') {
            cur = parent;
            parent = cur.parentElement;
        }
        el = cur;
    }
    const disabled = (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true';
    // Огромный кликабельный блок (полэкрана и больше) не «вдавливаем» — это уже не кнопка.
    const { width, height } = el.getBoundingClientRect();
    const huge = width * height > 0.5 * window.innerWidth * window.innerHeight;
    return disabled || huge ? null : el as HTMLElement;
};

/** Насколько «вдавить»: примерно на 4px по большей стороне, не сильнее 6% для мелких кнопок. */
const pressScale = (el: HTMLElement): number => {
    const { width, height } = el.getBoundingClientRect();
    return 1 - Math.min(0.06, 8 / Math.max(width, height, 1));
};

const initPressFeedback = (): void => {
    let active: { el: HTMLElement; x: number; y: number; timer: number; anim: Animation | null } | null = null;

    const pressIn = (state: NonNullable<typeof active>): void => {
        const s = pressScale(state.el);
        state.anim = state.el.animate(
            [{ scale: '1', opacity: 1 }, { scale: String(s), opacity: 0.82 }],
            { duration: PRESS_IN_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
        );
    };

    const release = (cancelled = false): void => {
        const state = active;
        if (!state) return;
        active = null;
        window.clearTimeout(state.timer);
        // Быстрый тап (отпустили раньше задержки) — всё равно короткий отклик, как у нативных кнопок.
        if (!state.anim && !cancelled) pressIn(state);
        const anim = state.anim;
        if (!anim) return;
        const back = (): void => {
            anim.playbackRate = -0.5;
            anim.play();
            anim.finished.then(() => anim.cancel(), () => {});
        };
        if (cancelled || anim.playState !== 'running') back();
        else anim.finished.then(back, () => {});
    };

    document.addEventListener('pointerdown', (e) => {
        if (reducedMotion() || (e.pointerType === 'mouse' && e.button !== 0) || !(e.target instanceof Element)) return;
        release(true);
        const el = findPressable(e.target);
        if (!el) return;
        const state = { el, x: e.clientX, y: e.clientY, timer: 0, anim: null as Animation | null };
        state.timer = window.setTimeout(() => { if (active === state) pressIn(state); }, PRESS_DELAY_MS);
        active = state;
    }, { capture: true, passive: true });

    document.addEventListener('pointermove', (e) => {
        if (active && Math.hypot(e.clientX - active.x, e.clientY - active.y) > MOVE_CANCEL_PX) release(true);
    }, { capture: true, passive: true });
    document.addEventListener('pointerup', () => release(), { capture: true, passive: true });
    document.addEventListener('pointercancel', () => release(true), { capture: true, passive: true });
    // Начали прокручивать список — это не нажатие.
    document.addEventListener('scroll', () => release(true), { capture: true, passive: true });
};

/** Модалки/меню и отклик на нажатие — один раз при запуске (переходы экранов — installNativePageTransitions). */
export function initNativeMotion(): void {
    if (!ENABLED) return;
    initOverlayGhosts();
    initPressFeedback();
}
