/**
 * Переписка в мобильной сборке — как в мессенджере, а не как лента на сайте (чаты и обращения в ТП):
 *
 *  - список «прилипает» к низу: открылась клавиатура, догрузилась картинка — последнее сообщение
 *    остаётся на виду, если пользователь и был внизу (читает историю — не дёргаем);
 *  - новое сообщение (своё или пришедшее) всплывает снизу, а не возникает;
 *  - отправка не закрывает клавиатуру (кнопка не забирает фокус у поля).
 *
 * Всё остальное (отправка без ожидания сервера, фото прямо в сообщении) — в самих экранах.
 */
import { useEffect, type RefObject } from 'react';
import { isNativeMotionEnabled } from './nativeMotion';

/** Ближе этого к низу — считаем, что пользователь «внизу» переписки. */
export const CHAT_BOTTOM_THRESHOLD = 80;

export const isNearBottom = (el: HTMLElement, threshold = CHAT_BOTTOM_THRESHOLD): boolean =>
    el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

/**
 * Держит список у низа, пока он меняет высоту (клавиатура, поле ввода выросло) или растёт содержимое
 * (догрузились фото) — если пользователь был внизу. `atBottomRef` обновляется здесь же, по прокрутке.
 * `deps` — когда список монтируется заново (другой чат), подписки ставятся на новый узел.
 */
export function useStickToBottom(
    listRef: RefObject<HTMLElement | null>,
    atBottomRef: { current: boolean },
    deps: readonly unknown[],
): void {
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        atBottomRef.current = isNearBottom(list);
        const onScroll = (): void => { atBottomRef.current = isNearBottom(list); };
        const keep = (): void => { if (atBottomRef.current) list.scrollTop = list.scrollHeight; };
        const resize = new ResizeObserver(keep);
        resize.observe(list);
        // Содержимое — всё, что внутри (обёртка сообщений появляется и пропадает вместе с ними).
        const observeContent = (): void => { Array.from(list.children).forEach((child) => resize.observe(child)); };
        observeContent();
        const children = new MutationObserver(observeContent);
        children.observe(list, { childList: true });
        list.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            resize.disconnect();
            children.disconnect();
            list.removeEventListener('scroll', onScroll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/** Новое сообщение всплывает снизу и проявляется (своё — от правого края, чужое — от левого). */
export function animateMessageEnter(el: Element | null | undefined, mine: boolean): void {
    if (!el || !isNativeMotionEnabled()) return;
    const origin = mine ? 'bottom right' : 'bottom left';
    el.animate(
        [
            { opacity: 0, translate: '0 16px', scale: '0.94', transformOrigin: origin },
            { opacity: 1, translate: '0 0', scale: '1', transformOrigin: origin },
        ],
        { duration: 280, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
    );
}

/**
 * Какие сообщения появились в конце переписки с прошлой отрисовки — их и анимируем. История, догруженная
 * сверху, и всё, что пришло вместе с открытием чата (`armed` = false), — без анимации. `seen` — ключи
 * уже показанных сообщений (обнуляется при смене чата).
 */
export function freshTailKeys(keys: (string | number)[], seen: Set<string | number>, armed: boolean): (string | number)[] {
    let lastSeen = -1;
    keys.forEach((key, i) => { if (seen.has(key)) lastSeen = i; });
    const fresh = keys.filter((key) => !seen.has(key));
    fresh.forEach((key) => seen.add(key));
    if (!armed) return [];
    return keys.slice(lastSeen + 1).filter((key) => fresh.includes(key));
}

/** Прогреть картинки (HTTP-кэш + декодирование), чтобы заменить ими локальные превью без мигания. */
export const warmImages = (urls: string[], timeoutMs = 4000): Promise<void> => Promise.race([
    Promise.allSettled(urls.map((url) => {
        const img = new Image();
        img.src = url;
        return img.decode();
    })).then(() => undefined),
    new Promise<void>((resolve) => { window.setTimeout(resolve, timeoutMs); }),
]);

/**
 * Кнопка отправки не забирает фокус у поля — клавиатура остаётся открытой, как в мессенджерах.
 * Вешается на onMouseDown (на телефоне фокус уходит именно на совместимом mousedown после касания).
 */
export const keepComposerFocus = (e: { preventDefault: () => void }): void => e.preventDefault();
