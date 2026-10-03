/**
 * Анимации мобильной сборки — как в нативном приложении, а не как на сайте. Работают только в
 * Capacitor (`html.native`), сайт этот модуль не задевает. Сами анимации — app/styles/native-motion.scss,
 * здесь — когда и в какую сторону их запускать:
 *
 *  - Переходы между экранами — View Transitions API: браузер снимает старый и новый экран и анимирует
 *    снимки, двух живых деревьев React не нужно. Везде одно движение — горизонтальное (Android: Material
 *    shared axis, iOS: «пуш» со сдвигом подложки): новый экран, в том числе вкладка нижней панели,
 *    приходит справа, «назад» — слева. Направление — класс на <html> (vt-forward / vt-back). Нижняя
 *    панель в переходе стоит на месте.
 *  - Модалки, меню, выпадающие списки, галерея: появление — CSS-анимацией; исчезновение — «призраком»:
 *    узел, который React уже удалил, клонируется и доигрывает анимацию ухода. Компоненты не меняются.
 *  - Нажатие: элемент слегка «вдавливается» и тускнеет (Web Animations — не CSS transition, чтобы не
 *    перебивать собственные transition компонентов), с короткой задержкой и отменой при прокрутке,
 *    как в нативных списках. Кроме фото и элементов, у которых свой `:active` со сжатием.
 *  - Листание фото в карусели карточки — сдвигом (slidePhoto). Перестройка блока на месте («Показать
 *    ещё», вкладки, фильтры) — живыми элементами, utils/nativeLayoutMotion.ts.
 */
import { Capacitor } from '@capacitor/core';
import { flushSync } from 'react-dom';
import type { createBrowserRouter } from 'react-router-dom';
import { TAB_PATHS } from '../app/layouts/keepAliveTabs';

type AppRouter = ReturnType<typeof createBrowserRouter>;
type Place = { pathname: string; search: string };
/**
 * forward/back — переход между экранами (и между вкладками нижней панели — тем же движением: отдельное
 * растворение для вкладок выглядело как «экран просто появился»), gallery-next/gallery-prev — листание фото
 * в галерее. Смена вида внутри экрана — не здесь, а живыми элементами (nativeLayoutMotion.ts): переход
 * снимком всей страницы «моргал» ею целиком.
 */
export type NativeMotion = 'forward' | 'back' | 'gallery-next' | 'gallery-prev' | 'none';
const MOTION_CLASSES = ['vt-forward', 'vt-back', 'vt-gallery-next', 'vt-gallery-prev'];

const ENABLED = Capacitor.isNativePlatform();
const VT_SUPPORTED = typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Анимации мобильной сборки включены: приложение (Capacitor) и в системе не включено «Убрать анимацию». */
export const isNativeMotionEnabled = (): boolean => ENABLED && !reducedMotion();

/**
 * Подложки диалогов: у большинства модалок — `modalOverlay`, у InfoModal («Как это работает») —
 * `overlay` с панелью `content` и крестиком внутри (просто `_overlay_` — это ещё и лоадер, и экран
 * «нет сети»).
 */
export const DIALOG_OVERLAY = '[class*="_modalOverlay_"], [class*="_overlay_"]:has(> [class*="_content_"] > [class*="_closeButton_"])';

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
    return 'forward';
};

// replace — обычно служебные перенаправления (без анимации), но переход на вкладку (логотип → главная)
// — как нажатие на вкладку, а из глубины (страница не из нижней панели) — «наверх», то есть назад.
const replaceMotion = (from: Place, to: Place): NativeMotion => {
    if (normalize(from.pathname) === normalize(to.pathname) || !isTab(to.pathname)) return 'none';
    return isTab(from.pathname) ? 'forward' : 'back';
};

const popMotion = (from: Place, to: Place): NativeMotion => {
    if (normalize(from.pathname) === normalize(to.pathname)) {
        return opensDetail(from.search) !== opensDetail(to.search) ? 'back' : 'none';
    }
    return 'back';
};

export const setNativeMotion = (motion: NativeMotion): void => {
    const classes = document.documentElement.classList;
    classes.remove(...MOTION_CLASSES);
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
 * Прокрутка окна, запрошенная во время обновления в переходе, — в самом конце обновления, перед снимком
 * нового экрана. На iOS прокрутка посреди обновления сразу двигала ещё «замороженный» старый экран (вместе с
 * нижней панелью) — до начала анимации он «улетал» вверх или вниз. Прокручивают при смене экрана Layout и
 * TabKeepAlive (сброс наверх, восстановление позиции); пока идёт обновление, window.scrollTo только
 * запоминает последнюю запрошенную позицию.
 */
const deferScrollDuringTransitionUpdates = (): void => {
    const startViewTransition = document.startViewTransition.bind(document);
    const scrollTo = window.scrollTo.bind(window) as (...args: unknown[]) => void;
    let updating = 0;
    let pending: unknown[] | null = null;
    window.scrollTo = ((...args: unknown[]) => {
        if (updating > 0) pending = args;
        else scrollTo(...args);
    }) as typeof window.scrollTo;
    document.startViewTransition = ((arg?: ViewTransitionUpdateCallback | StartViewTransitionOptions) => {
        const update = typeof arg === 'function' ? arg : arg?.update;
        const deferred = async (): Promise<void> => {
            updating++;
            try {
                await update?.();
            } finally {
                updating--;
                if (updating === 0 && pending) {
                    const args = pending;
                    pending = null;
                    scrollTo(...args);
                }
            }
        };
        return startViewTransition(typeof arg === 'object' && arg ? { ...arg, update: deferred } : deferred);
    }) as typeof document.startViewTransition;
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
    deferScrollDuringTransitionUpdates();
    let current: Place = { pathname: router.state.location.pathname, search: router.state.location.search };
    let currentKey = router.state.location.key;

    // Подписка раньше RouterProvider'а — класс направления стоит до того, как он запустит переход.
    router.subscribe((state) => {
        if (state.location.key === currentKey) return;
        const next: Place = { pathname: state.location.pathname, search: state.location.search };
        const motion: NativeMotion = reducedMotion() ? 'none'
            : state.historyAction === 'POP' ? popMotion(current, next)
            : state.historyAction === 'REPLACE' ? replaceMotion(current, next)
            : pushMotion(current, next);
        setNativeMotion(motion);
        current = next;
        currentKey = state.location.key;
    });

    const navigate = router.navigate.bind(router);
    router.navigate = ((to: unknown, opts?: Record<string, unknown>) => {
        if (typeof to === 'number' || reducedMotion()) return navigate(to as never, opts as never);
        const target = resolvePlace(to, current);
        const animate = target !== null && (opts?.replace ? replaceMotion(current, target) : pushMotion(current, target)) !== 'none';
        return navigate(to as never, (animate ? { ...opts, viewTransition: true } : opts) as never);
    }) as AppRouter['navigate'];
}

/**
 * Анимированная смена вида без смены адреса (например, список чатов → переписка на телефоне):
 * тот же переход, что между экранами. Обновление применяется синхронно внутри перехода.
 */
let applyingUpdate = false;

export function runNativeTransition(motion: NativeMotion, update: () => void): void {
    // Вызов изнутри другого такого же обновления — это уже часть идущего перехода: применяем сразу,
    // второй переход не начинаем.
    if (applyingUpdate || !ENABLED || !VT_SUPPORTED || motion === 'none' || reducedMotion()) {
        update();
        return;
    }
    setNativeMotion(motion);
    document.startViewTransition(() => {
        applyingUpdate = true;
        try {
            flushSync(update);
        } finally {
            applyingUpdate = false;
        }
    });
}

// ── Листание фото на месте (карусель в карточке) ────────────────────────────────────────────────

/**
 * Смена фото в рамке `frame` (карусель карточки — без полноэкранной галереи): старое уезжает в сторону
 * листания, новое въезжает следом, как в нативных каруселях. Обновление применяется синхронно.
 */
export function slidePhoto(frame: HTMLElement | null, direction: 1 | -1, update: () => void): void {
    const img = frame?.querySelector<HTMLImageElement>(':scope > img');
    if (!isNativeMotionEnabled() || !frame || !img) {
        update();
        return;
    }
    // Предыдущее листание ещё едет — доводим его сразу.
    frame.querySelectorAll('[data-native-ghost="slide"]').forEach((g) => g.remove());
    img.getAnimations().forEach((a) => a.finish());
    const ghost = img.cloneNode(true) as HTMLImageElement;
    ghost.setAttribute('data-native-ghost', 'slide');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.loading = 'eager';
    Object.assign(ghost.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    flushSync(update);
    if (!img.isConnected) return;
    // Над новым фото, но под стрелками (у них свой z-index).
    img.after(ghost);
    const timing: KeyframeAnimationOptions = { duration: 280, easing: 'cubic-bezier(0.2, 0, 0, 1)' };
    const remove = (): void => ghost.remove();
    ghost.animate([{ translate: '0 0' }, { translate: `${-direction * 100}% 0` }], { ...timing, fill: 'forwards' }).finished.then(remove, remove);
    img.animate([{ translate: `${direction * 100}% 0` }, { translate: '0 0' }], timing);
}

// ── Исчезновение модалок, меню, списков: «призраки» ─────────────────────────────────────────────

type GhostKind = 'dialog' | 'gallery' | 'menu' | 'listbox';
const GHOSTS: { selector: string; kind: GhostKind; ms: number; inPlace?: boolean }[] = [
    { selector: DIALOG_OVERLAY, kind: 'dialog', ms: 190 },
    { selector: '[class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"]', kind: 'gallery', ms: 200 },
    { selector: '[data-actions-dropdown-portal]', kind: 'menu', ms: 150 },
    // Выпадающий список позиционирован внутри своего поля — призрак остаётся там же, и только если
    // закрылся сам список, а не всё поле.
    { selector: '[class*="_dropdown_"][role="listbox"]', kind: 'listbox', ms: 140, inPlace: true },
    { selector: '[class*="_language_dropdown_"]', kind: 'listbox', ms: 140, inPlace: true },
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
const BUTTONISH = 'button, a[href], a[data-native-href], [role="button"], [role="tab"], [role="option"], label[for], summary';
const NOT_PRESSABLE = 'input, textarea, select, [contenteditable="true"], [data-native-ghost], [class*="_mobile_header_"]';
// Выше этих контейнеров не поднимаемся: подложка модалки или галереи — не кнопка, даже с cursor: pointer.
const PRESS_BOUNDARY = `${DIALOG_OVERLAY}, [class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"], main`;
const POPUP_CANDIDATES = '[role="listbox"], [role="menu"], [role="tooltip"], [class*="dropdown" i], [class*="popover" i], [class*="tooltip" i]';

/** Выходит ли элемент за рамки `box` — то есть «выпадает» из своего владельца наружу. */
const escapesBounds = (child: Element, box: DOMRect): boolean => {
    const r = child.getBoundingClientRect();
    return r.width > 0 && r.height > 0
        && (r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.right > box.right + 1);
};

/**
 * Фото (сама картинка или рамка, которую она почти целиком занимает: карусель карточки, миниатюры,
 * снимок в галерее) не «вдавливаем»: в нативных приложениях фото на касание не сжимается, а сжатие
 * перед открытием галереи (у которой своё «приближение») выглядело как двойное нажатие.
 */
const isPhoto = (el: Element): boolean => {
    if (el.tagName === 'IMG') return true;
    const img = el.querySelector('img');
    if (!img) return false;
    const frame = el.getBoundingClientRect();
    const pic = img.getBoundingClientRect();
    return pic.width * pic.height >= 0.8 * frame.width * frame.height;
};

/**
 * Селекторы элементов, у которых уже есть свой отклик на нажатие — `:active { transform/scale }` в их
 * стилях (кнопки карточки, переключатель языка и т.п.). Наш поверх давал «двойное нажатие»: сначала
 * срабатывал их CSS, через миг — наш. Собираем из таблиц стилей (без `:active`) и пересобираем, когда
 * таблиц становится больше: стили экранов подгружаются по мере переходов.
 */
let ownPressSelectors: string[] = [];
let scannedSheets = -1;
const collectOwnPress = (): string[] => {
    if (document.styleSheets.length === scannedSheets) return ownPressSelectors;
    scannedSheets = document.styleSheets.length;
    const found: string[] = [];
    const walk = (rules: CSSRuleList): void => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
                if (!rule.selectorText.includes(':active') || !(rule.style.transform || rule.style.scale)) continue;
                for (const part of rule.selectorText.split(',')) {
                    if (part.includes(':active') && !part.includes(':not(:active')) found.push(part.replace(/:active/g, '').trim());
                }
            } else if (rule instanceof CSSGroupingRule) {
                walk(rule.cssRules);
            }
        }
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try { walk(sheet.cssRules); } catch { /* таблица с чужого домена — правил не видно */ }
    }
    ownPressSelectors = found;
    return found;
};
const hasOwnPress = (el: Element): boolean => collectOwnPress().some((selector) => {
    try { return el.matches(selector); } catch { return false; }
});

/**
 * Открыто ли внутри элемента выпадающее наружу (список языков под кнопкой и т.п.). Пока элемент
 * «вдавлен», он — отдельный слой (scale/opacity), и всё внутри рисуется в пределах этого слоя:
 * список уходил ПОД соседние блоки (а с ним и касания). Такие элементы не «вдавливаем».
 */
const hasPopup = (el: Element): boolean => {
    const box = el.getBoundingClientRect();
    return Array.from(el.querySelectorAll(POPUP_CANDIDATES)).some((popup) => escapesBounds(popup, box));
};

/** Есть ли у узла обработчик нажатия React (onClick и т.п.) — так находим настоящий «кликабельный» элемент. */
const hasReactPressHandler = (el: Element): boolean => {
    const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'));
    const props = key ? (el as unknown as Record<string, Record<string, unknown> | undefined>)[key] : undefined;
    return !!props && ['onClick', 'onPointerUp', 'onMouseUp', 'onTouchEnd'].some((name) => typeof props[name] === 'function');
};

/**
 * Что «вдавить» при касании: ближайшая кнопка/ссылка или ближайший элемент с обработчиком нажатия
 * (карточки, строки, плитки, пункты меню). Не «ближайший с cursor: pointer» — cursor наследуется, и
 * вдавливался бы весь контейнер со своим выпадающим списком: под пальцем к отпусканию оказывался
 * другой элемент, и нажатие уходило не туда.
 */
const findPressable = (target: Element): HTMLElement | null => {
    if (target.closest(NOT_PRESSABLE)) return null;
    let el: Element | null = null;
    const path: Element[] = [];
    for (let cur: Element | null = target, depth = 0; cur && cur !== document.body && depth < 12; depth++, cur = cur.parentElement) {
        if (cur.matches(PRESS_BOUNDARY)) return null;
        path.push(cur);
        if (cur.matches(BUTTONISH) || hasReactPressHandler(cur)) { el = cur; break; }
    }
    if (!el) return null;
    const disabled = (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true';
    // Огромный кликабельный блок (полэкрана и больше) не «вдавливаем» — это уже не кнопка.
    const { width, height } = el.getBoundingClientRect();
    const huge = width * height > 0.5 * window.innerWidth * window.innerHeight;
    return disabled || huge || isPhoto(el) || hasPopup(el) || path.some(hasOwnPress) ? null : el as HTMLElement;
};

/** Насколько «вдавить»: примерно на 4px по большей стороне, не сильнее 6% для мелких кнопок. */
const pressScale = (el: HTMLElement): number => {
    const { width, height } = el.getBoundingClientRect();
    return 1 - Math.min(0.06, 8 / Math.max(width, height, 1));
};

type Press = { el: HTMLElement; x: number; y: number; timer: number; anim: Animation | null; watch: MutationObserver | null; dead: boolean };

const initPressFeedback = (): void => {
    let active: Press | null = null;

    // Отклик снят сразу и насовсем (без обратной анимации).
    const kill = (state: Press): void => {
        state.dead = true;
        window.clearTimeout(state.timer);
        state.anim?.cancel();
        state.watch?.disconnect();
        if (active === state) active = null;
    };

    // Это же нажатие может открыть выпадающее внутри элемента (список языков) — тогда отклик снимаем
    // до первого кадра со списком, иначе он нарисовался бы под соседними блоками (см. hasPopup).
    const watchForPopup = (state: Press): void => {
        state.watch = new MutationObserver((records) => {
            const box = state.el.getBoundingClientRect();
            if (records.some((r) => Array.from(r.addedNodes).some((n) => n instanceof Element && escapesBounds(n, box)))) kill(state);
        });
        state.watch.observe(state.el, { childList: true, subtree: true });
    };

    const pressIn = (state: Press): void => {
        if (state.dead) return;
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
        if (state.dead) return;
        // Быстрый тап (отпустили раньше задержки) — всё равно короткий отклик, как у нативных кнопок.
        if (!state.anim && !cancelled) pressIn(state);
        const anim = state.anim;
        if (!anim) {
            state.watch?.disconnect();
            return;
        }
        const back = (): void => {
            if (state.dead) return;
            anim.playbackRate = -0.5;
            anim.play();
            anim.finished.then(() => { anim.cancel(); state.watch?.disconnect(); }, () => {});
        };
        if (cancelled || anim.playState !== 'running') back();
        else anim.finished.then(back, () => {});
    };

    document.addEventListener('pointerdown', (e) => {
        if (reducedMotion() || (e.pointerType === 'mouse' && e.button !== 0) || !(e.target instanceof Element)) return;
        release(true);
        const el = findPressable(e.target);
        if (!el) return;
        const state: Press = { el, x: e.clientX, y: e.clientY, timer: 0, anim: null, watch: null, dead: false };
        watchForPopup(state);
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
