/**
 * Плавная перестройка блока на месте — «Показать ещё / меньше», смена вкладки, раскрытие фильтров.
 * Как LayoutTransition в Android: высота блока меняется плавно (всё, что ниже, съезжает следом),
 * появившиеся элементы проявляются, исчезнувшие растворяются на своём прежнем месте, сдвинувшиеся
 * внутри блока — доезжают до нового. Анимируются живые элементы, а не снимок страницы, поэтому
 * остальная страница не «моргает». Только мобильная сборка (см. isNativeMotionEnabled).
 *
 * Компонентам не нужно знать, какие именно узлы у них поменяются: снимаем положения элементов вокруг
 * места действия, применяем обновление и ловим изменения DOM (MutationObserver). Его колбэк приходит
 * после коммита React, но до отрисовки кадра — анимация начинается с первого же кадра, без скачка.
 */
import { DIALOG_OVERLAY, isNativeMotionEnabled } from './nativeMotion';

/** Прямоугольник в координатах документа (не зависит от прокрутки между замерами). */
type Box = { top: number; left: number; width: number; height: number };
type Removal = { node: HTMLElement; parent: Node };

export interface LayoutChangeOptions {
    /** Держать этот элемент на месте экрана, пока всё меняется (кнопка «Показать меньше» — под пальцем). */
    anchor?: Element | null;
    /** Изменения внутри этого узла сами по себе ничего не запускают (спиннер на кнопке, сами вкладки). */
    ignore?: Element | null;
    /** Изменение придёт не сразу (данные догружаются с сервера): ждём его до 15 с. */
    wait?: boolean;
}

const MOVE_MS = 300;
const ENTER_MS = 260;
const EXIT_MS = 170;
const EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)';
const DECELERATE = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
// Сколько уровней вверх от места действия может быть блок, который меняется, и сколько элементов
// снимать заранее: этого хватает для секции со списком, не трогая всю страницу.
const MAX_LEVELS = 7;
const MAX_BOXES = 800;
const STAGGER_MS = 28;
const MAX_STAGGER = 8;
const SYNC_WAIT_MS = 150;
const ASYNC_WAIT_MS = 15000;
// Узлы, у которых своя анимация исчезновения (диалоги, галерея, меню — см. nativeMotion.ts).
const OWN_EXIT = `${DIALOG_OVERLAY}, [class*="_photo_modal_overlay_"], [class*="_photoModalOverlay_"], [data-actions-dropdown-portal], [role="listbox"], [class*="_language_dropdown_"]`;

let finishCurrent: (() => void) | null = null;

const boxOf = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
};

// Узел React, а не чужой: Swiper сам перерисовывает точки пагинации и считает слайды по DOM — «призрак»
// среди его узлов сбивал ему подсчёт (точек оставалось не столько, сколько страниц). Его узлы не трогаем.
const isReactNode = (el: Element): boolean => Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
const SWIPER_OWNED = '[class*="swiper-"]';

// На экране или рядом с ним (по вертикали — с запасом в экран: при сворачивании страница докручивается,
// и соседнее заезжает в кадр). По горизонтали — строго: соседние страницы карусели лежат за краем.
const onScreen = (b: Box): boolean => {
    const top = b.top - window.scrollY;
    const left = b.left - window.scrollX;
    const margin = window.innerHeight;
    return b.width > 0 && b.height > 0 && top < window.innerHeight + margin && top + b.height > -margin
        && left < window.innerWidth && left + b.width > 0;
};

/** Без анимации: применить и (как сайт) вернуть `anchor` на прежнее место экрана. */
const applyPlain = (update: (() => void) | undefined, anchor: Element | null): void => {
    const top = anchor?.getBoundingClientRect().top;
    update?.();
    if (!anchor || top === undefined) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        if (anchor.isConnected) window.scrollBy({ top: anchor.getBoundingClientRect().top - top, behavior: 'instant' });
    }));
};

const lowestCommonAncestor = (nodes: Element[]): Element | null => {
    let lca: Element | null = null;
    for (const el of nodes) {
        if (!lca) lca = el;
        while (lca && !lca.contains(el)) lca = lca.parentElement;
    }
    return lca;
};

/**
 * Применить `update` (или дождаться изменения, `wait`) и плавно перестроить блок вокруг `origin`.
 * `origin` — элемент рядом с изменением (кнопка «Показать ещё», вкладки, корень поиска): меняющийся
 * блок — он сам или ближайший его предок, в котором случились изменения.
 */
export function animateLayoutChange(origin: Element | null | undefined, update?: () => void, options: LayoutChangeOptions = {}): void {
    const { anchor = null, ignore = null, wait = false } = options;
    finishCurrent?.();
    if (!isNativeMotionEnabled() || !origin?.isConnected) {
        applyPlain(update, anchor);
        return;
    }

    const candidates: HTMLElement[] = [];
    for (let el: Element | null = origin; el && el !== document.body && candidates.length < MAX_LEVELS; el = el.parentElement) {
        if (el instanceof HTMLElement) candidates.push(el);
        if (el.tagName === 'MAIN') break;
    }
    const root = candidates[candidates.length - 1];
    if (!root) {
        applyPlain(update, anchor);
        return;
    }

    // Положения «до»: сначала всё ближайшее (поддерево самого origin, потом его родителя и т.д.), пока
    // не наберётся MAX_BOXES — меняющийся блок почти всегда рядом с местом действия.
    const before = new Map<Element, Box>();
    // Удалённым узлам React стирает свои метки — какие узлы его, запоминаем заранее.
    const fromReact = new WeakSet<Element>();
    for (const candidate of candidates) {
        const queue: Element[] = [candidate];
        for (let i = 0; i < queue.length && before.size < MAX_BOXES; i++) {
            const el = queue[i];
            if (el.hasAttribute('data-native-ghost') || (el !== candidate && before.has(el))) continue;
            if (!before.has(el)) {
                before.set(el, boxOf(el));
                if (isReactNode(el)) fromReact.add(el);
            }
            for (const child of Array.from(el.children)) queue.push(child);
        }
    }
    candidates.forEach((c) => { if (!before.has(c)) before.set(c, boxOf(c)); });
    const anchorTop = anchor?.getBoundingClientRect().top ?? null;

    let waiting = true;
    const stopWaiting = (): void => {
        if (!waiting) return;
        waiting = false;
        observer.disconnect();
        window.clearTimeout(timer);
        if (finishCurrent === stopWaiting) finishCurrent = null;
    };

    // Изменения копятся, пока не наберётся существенное: React и Swiper (автовысота, точки пагинации)
    // применяют одно обновление в несколько приёмов.
    const added = new Set<HTMLElement>();
    const removed = new Map<HTMLElement, Removal>();
    const parents: Element[] = [];
    let relevant = false;
    const observer = new MutationObserver((records) => {
        for (const r of records) {
            if (r.type !== 'childList' || !(r.target instanceof Element)) continue;
            const outsideIgnore = !ignore || !ignore.contains(r.target);
            r.removedNodes.forEach((n) => {
                if (!(n instanceof HTMLElement) || n.hasAttribute('data-native-ghost')) return;
                if (added.delete(n)) return; // переставили — не удаление
                removed.set(n, { node: n, parent: r.target });
                if (outsideIgnore && r.target.isConnected) { relevant = true; parents.push(r.target as Element); }
            });
            r.addedNodes.forEach((n) => {
                if (!(n instanceof HTMLElement) || n.hasAttribute('data-native-ghost')) return;
                if (removed.delete(n)) return;
                added.add(n);
                if (outsideIgnore) { relevant = true; parents.push(r.target as Element); }
            });
        }
        if (!relevant) return;
        const lca = lowestCommonAncestor(parents.filter((p) => p.isConnected));
        const scope = lca ? candidates.find((c) => c.contains(lca)) : undefined;
        if (!scope) return;
        // Ждём данные: служебные перестановки без изменения высоты (спиннер, заглушка картинки) — ещё не то.
        if (wait && Math.abs(scope.getBoundingClientRect().height - before.get(scope)!.height) < 1) return;
        stopWaiting();
        // Только верхние узлы: вставленное внутрь только что вставленного (или удалённое из удалённого) —
        // часть того же изменения.
        const topAdded = [...added].filter((n) => {
            if (!n.isConnected) return false;
            for (let p = n.parentElement; p; p = p.parentElement) if (added.has(p)) return false;
            return true;
        });
        run(scope, topAdded, [...removed.values()].filter((r) => r.parent.isConnected));
    });

    const run = (scope: HTMLElement, addedNodes: HTMLElement[], removedNodes: Removal[]): void => {
        const animations: Animation[] = [];
        const ghosts: HTMLElement[] = [];
        const undo: (() => void)[] = [];
        const scopeBefore = before.get(scope)!;
        const measure = (): Map<Element, Box> => {
            const boxes = new Map<Element, Box>();
            for (const el of before.keys()) if (el.isConnected && scope.contains(el)) boxes.set(el, boxOf(el));
            if (!boxes.has(scope)) boxes.set(scope, boxOf(scope));
            return boxes;
        };
        const animateHeight = (el: HTMLElement, h0: number, h1: number, clip: boolean): void => {
            const cs = getComputedStyle(el);
            const extra = cs.boxSizing === 'border-box' ? 0
                : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
            if (clip && cs.overflowY === 'visible') {
                const prev = el.style.overflow;
                el.style.overflow = 'clip';
                undo.push(() => { el.style.overflow = prev; });
            }
            animations.push(el.animate([{ height: `${h0 - extra}px` }, { height: `${h1 - extra}px` }], { duration: MOVE_MS, easing: EMPHASIZED }));
        };

        // Конечное расположение — до первой анимации (сдвиг родителя сдвинул бы и замеры его потомков).
        const final = measure();
        const scopeFinal = final.get(scope)!;
        const added = addedNodes.filter((node) => isReactNode(node) && !node.matches(OWN_EXIT) && onScreen(boxOf(node)));

        // Кто внутри блока сам обрезает содержимое и сменил высоту (карусель с автовысотой), тот меняет её
        // плавно — иначе прыгала бы сразу, а исчезающее обрезалось бы по новой границе. Всё, что ниже
        // такого, едет следом само, раскладкой.
        let innerResized = false;
        for (const [el, is] of final) {
            const was = before.get(el)!;
            if (el === scope || !(el instanceof HTMLElement) || Math.abs(is.height - was.height) < 1) continue;
            const cs = getComputedStyle(el);
            if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
            animateHeight(el, was.height, is.height, false);
            innerResized = true;
        }
        // Расположение в первом кадре (с этими высотами в начальном значении) — от него и считаем, кому
        // сколько доехать: старое место минус место в первом кадре, относительно самого блока.
        const first = innerResized ? measure() : final;
        const scopeFirst = first.get(scope)!;
        const offset = (el: Element): { x: number; y: number } => {
            const was = before.get(el);
            const is = first.get(el);
            if (!was || !is) return { x: 0, y: 0 };
            return {
                x: (was.left - scopeBefore.left) - (is.left - scopeFirst.left),
                y: (was.top - scopeBefore.top) - (is.top - scopeFirst.top),
            };
        };

        // Сдвинувшиеся внутри блока доезжают до нового места (FLIP) — каждый относительно родителя,
        // чтобы вложенные сдвиги не складывались дважды.
        for (const el of first.keys()) {
            if (el === scope || !(el instanceof HTMLElement)) continue;
            const was = before.get(el)!;
            if (was.width === 0 && was.height === 0) continue;
            const own = offset(el);
            const parent = el.parentElement;
            const base = parent && parent !== scope && first.has(parent) ? offset(parent) : { x: 0, y: 0 };
            const dx = own.x - base.x;
            const dy = own.y - base.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
            animations.push(el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration: MOVE_MS, easing: EMPHASIZED, composite: 'add' }));
        }

        // Исчезнувшие возвращаются «призраками» — поверх нового, на прежнем месте. Уже после FLIP: сдвинутый
        // (translate) предок становится содержащим блоком для absolute-потомков, и замер «нуля» до него дал
        // бы не ту точку отсчёта. Сначала вставляем все, потом меряем разом (иначе — пересчёт на каждый).
        const exits = removedNodes.flatMap(({ node, parent }) => {
            const was = before.get(node);
            if (!was || !fromReact.has(node) || node.matches(SWIPER_OWNED) || !onScreen(was) || node.matches(OWN_EXIT) || node.querySelector(OWN_EXIT)) return [];
            const host = parent instanceof HTMLElement && parent.isConnected && scope.contains(parent) ? parent : scope;
            node.getAnimations().forEach((a) => a.cancel());
            node.setAttribute('data-native-ghost', 'layout');
            node.setAttribute('aria-hidden', 'true');
            node.inert = true;
            // transition: none — у многих блоков (карточка) `transition: all`: иначе left/top «доезжали»
            // из угла контейнера, и призрак пролетал через полэкрана.
            Object.assign(node.style, {
                position: 'absolute', left: '0px', top: '0px', margin: '0', boxSizing: 'border-box',
                width: `${was.width}px`, height: `${was.height}px`, transform: 'none', pointerEvents: 'none', transition: 'none',
            });
            host.appendChild(node);
            ghosts.push(node);
            return [{ node, was }];
        });
        const zero = exits.map(({ node }) => node.getBoundingClientRect());
        exits.forEach(({ node, was }, i) => {
            // left/top 0 — угол содержащего блока (с его сдвигом в первом кадре). Ставим на прежнее место
            // внутри блока; дальше призрак едет вместе со своим контейнером.
            const x = was.left - scopeBefore.left + scopeFirst.left - window.scrollX;
            const y = was.top - scopeBefore.top + scopeFirst.top - window.scrollY;
            node.style.left = `${x - zero[i].left}px`;
            node.style.top = `${y - zero[i].top}px`;
            animations.push(node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_MS, easing: 'ease-out', fill: 'forwards' }));
        });

        // Появившиеся — проявляются и чуть всплывают; несколько в одном списке — лесенкой.
        const order = new Map<Element | null, number>();
        for (const node of added) {
            const index = order.get(node.parentElement) ?? 0;
            order.set(node.parentElement, index + 1);
            const timing: KeyframeAnimationOptions = {
                duration: ENTER_MS, delay: 40 + Math.min(index, MAX_STAGGER) * STAGGER_MS, easing: DECELERATE, fill: 'backwards',
            };
            animations.push(node.animate([{ opacity: 0 }, { opacity: 1 }], timing));
            animations.push(node.animate([{ translate: '0px 10px' }, { translate: '0px 0px' }], { ...timing, composite: 'add' }));
        }

        // Высота самого блока — плавно; лишнее на время прячем (иначе новое вылезло бы сразу целиком).
        if (Math.abs(scopeFinal.height - scopeBefore.height) >= 1) animateHeight(scope, scopeBefore.height, scopeFinal.height, true);

        // Якорь остаётся на месте экрана: докручиваем страницу каждый кадр, пока всё едет.
        let finished = false;
        let raf = 0;
        const keepAnchor = (): void => {
            if (!anchor?.isConnected || anchorTop === null) return;
            const d = anchor.getBoundingClientRect().top - anchorTop;
            if (Math.abs(d) >= 0.5) window.scrollBy({ top: d, behavior: 'instant' });
        };
        const tick = (): void => {
            keepAnchor();
            if (!finished) raf = requestAnimationFrame(tick);
        };
        if (anchor) raf = requestAnimationFrame(tick);

        const finish = (): void => {
            if (finished) return;
            finished = true;
            window.clearTimeout(fallback);
            cancelAnimationFrame(raf);
            animations.forEach((a) => a.cancel());
            ghosts.forEach((g) => g.remove());
            undo.forEach((f) => f());
            keepAnchor();
            if (finishCurrent === finish) finishCurrent = null;
        };
        // Конец — по самим анимациям (а не по таймеру): так и при замедленной отладке, и на медленном телефоне.
        void Promise.allSettled(animations.map((a) => a.finished)).then(finish);
        const fallback = window.setTimeout(finish, 6000);
        finishCurrent = finish;
    };

    observer.observe(root, { childList: true, subtree: true });
    const timer = window.setTimeout(() => {
        stopWaiting();
        // Изменение так и не пришло (или пришло позже) — якорь всё равно на место, как без анимации.
        if (anchor?.isConnected && anchorTop !== null) window.scrollBy({ top: anchor.getBoundingClientRect().top - anchorTop, behavior: 'instant' });
    }, wait ? ASYNC_WAIT_MS : SYNC_WAIT_MS);
    finishCurrent = stopWaiting;
    update?.();
}
