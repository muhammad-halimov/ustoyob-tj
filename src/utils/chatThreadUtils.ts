/**
 * Переписка — как в мессенджере, а не как лента (чаты и обращения в ТП):
 *
 *  - список «прилипает» к низу: открылась клавиатура, выросло поле ввода, догрузилась картинка —
 *    последнее сообщение остаётся на виду, если пользователь и был внизу (читает историю — не дёргаем);
 *  - отправка не закрывает клавиатуру (кнопка не забирает фокус у поля);
 *  - своё сообщение с фото сменяется серверным без мигания: его картинки прогреваются заранее.
 *
 * Отправка без ожидания сервера и фото прямо в сообщении — в самих экранах (Chat, TechSupportThread).
 */
import { useEffect, type RefObject } from 'react';

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
