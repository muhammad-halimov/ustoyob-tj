/**
 * Переписка в мобильной сборке — поверх общего поведения мессенджера (utils/chatThreadUtils.ts: список
 * у низа, фокус поля при отправке, прогрев картинок — то же и на сайте): новое сообщение (своё или
 * пришедшее) всплывает снизу, а не возникает.
 */
import { isNativeMotionEnabled } from './nativeMotion';

export { CHAT_BOTTOM_THRESHOLD, isNearBottom, keepComposerFocus, useStickToBottom, warmImages } from './chatThreadUtils';

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
