/**
 * Касания в приложении — без «залипающих» состояний мобильного сайта. На тач-экране :hover остаётся на
 * элементе после тапа (кнопка, иконка, поле так и подсвечены, пока не коснёшься другого места), а то, по чему
 * тапнули, остаётся в фокусе — со своими стилями :focus и подсветкой контейнера (:focus-within, например
 * панель ввода в чате после скрепки). В нативных приложениях такого нет. Только мобильная сборка.
 *
 *  - Подсветка «под курсором» из стилей убирается — и из стилей, подгружаемых позже. Остаются правила, где
 *    :hover у предка только показывает спрятанное (`.message:hover .actions { opacity: 1 }` — действия
 *    сообщения, стрелки фото): на тач-экране это «показать по тапу», без них часть кнопок не открыть.
 *  - После тапа фокус снимается со всего, кроме полей ввода (в них фокус — это и есть ввод) и выпадающих
 *    списков/выбора даты (нативный выбор открыт, пока элемент в фокусе).
 */
import { Capacitor } from '@capacitor/core';

/** Свойства «показать спрятанное» — правило с :hover у предка, меняющее только их, оставляем. */
const REVEAL_PROPS = new Set(['opacity', 'visibility', 'display', 'pointer-events', 'transform', 'translate', 'scale']);
const KEEPS_FOCUS = 'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="file"], [type="image"], [type="range"], [type="color"])';

/** Список селекторов → отдельные селекторы (запятые внутри скобок — не разделители). */
const splitSelectors = (text: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === ',' && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(text.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
};

/** Селектор без групп `:not(...)` — :hover внутри них означает «не наведено», это не подсветка. */
const withoutNot = (selector: string): string => {
    let out = '';
    for (let i = 0; i < selector.length; i++) {
        if (!selector.startsWith(':not(', i)) {
            out += selector[i];
            continue;
        }
        let depth = 0;
        for (; i < selector.length; i++) {
            if (selector[i] === '(') depth++;
            else if (selector[i] === ')' && --depth === 0) break;
        }
    }
    return out;
};

/** Последнее составное звено селектора — сам стилизуемый элемент (после последнего комбинатора). */
const subjectOf = (selector: string): string => {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < selector.length; i++) {
        const c = selector[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && (c === ' ' || c === '>' || c === '+' || c === '~')) start = i + 1;
    }
    return selector.slice(start);
};

const isRevealOnly = (rule: CSSStyleRule): boolean => {
    for (let i = 0; i < rule.style.length; i++) {
        const prop = rule.style[i];
        if (!REVEAL_PROPS.has(prop) && !prop.startsWith('transition')) return false;
    }
    return rule.style.length > 0;
};

/** Убрать из селекторов правила подсветку «под курсором»; false — от правила ничего не осталось. */
const stripRule = (rule: CSSStyleRule): boolean => {
    const selectors = splitSelectors(rule.selectorText);
    const keep = selectors.filter((selector) => {
        const plain = withoutNot(selector);
        if (!plain.includes(':hover')) return true;
        if (withoutNot(subjectOf(selector)).includes(':hover')) return false;
        return isRevealOnly(rule);
    });
    if (keep.length === 0) return false;
    if (keep.length < selectors.length) rule.selectorText = keep.join(', ');
    return true;
};

const stripRules = (owner: CSSStyleSheet | CSSGroupingRule): void => {
    const rules = owner.cssRules;
    for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule instanceof CSSStyleRule) {
            if (rule.selectorText.includes(':hover') && !stripRule(rule)) owner.deleteRule(i);
        } else if (rule instanceof CSSGroupingRule) {
            stripRules(rule);
        }
    }
};

const processed = new WeakSet<CSSStyleSheet>();
const stripSheets = (): void => {
    for (const sheet of Array.from(document.styleSheets)) {
        if (processed.has(sheet)) continue;
        try {
            stripRules(sheet);
            processed.add(sheet);
        } catch {
            // чужой домен (шрифты) — правил не прочитать, и :hover там нет
            processed.add(sheet);
        }
    }
};

export function initNativeTouch(): void {
    if (!Capacitor.isNativePlatform()) return;

    stripSheets();
    // Стили, подгружаемые позже (страницы по требованию), и <link>, ещё не догрузившиеся к старту.
    new MutationObserver((records) => {
        stripSheets();
        for (const r of records) {
            r.addedNodes.forEach((n) => {
                if (n instanceof HTMLLinkElement) n.addEventListener('load', stripSheets, { once: true });
            });
        }
    }).observe(document.head, { childList: true, subtree: true, characterData: true });
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.addEventListener('load', stripSheets, { once: true }));

    // Долгое нажатие не открывает системное меню/предпросмотр ссылок и картинок (в тексте и полях — оставляем:
    // там это «копировать/вставить»). iOS-предпросмотр ссылки отключён в capacitor.config.ts (allowsLinkPreview).
    window.addEventListener('contextmenu', (e) => {
        if (e.target instanceof Element && e.target.closest('a, img, svg, button, [role="button"], nav') && !e.target.closest(KEEPS_FOCUS)) e.preventDefault();
    });

    // Фокус после тапа — последним обработчиком: если тап сам перевёл фокус (открыл поиск), он уже не на
    // кнопке. detail === 0 — «клик» с клавиатуры (Enter/пробел): там фокус нужен.
    window.addEventListener('click', (e) => {
        if (e.detail === 0) return;
        const el = document.activeElement;
        if (el instanceof HTMLElement && el !== document.body && !el.matches(KEEPS_FOCUS)) el.blur();
    });
}
