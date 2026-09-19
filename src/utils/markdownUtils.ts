import DOMPurify from 'dompurify';
import { Marked } from 'marked';

/**
 * Markdown → безопасный HTML.
 *
 * Два режима:
 * - по умолчанию (`trusted: false`) — текст от пользователей (описание/заметки объявления):
 *   сырой HTML экранируется, картинки не рендерятся (трекинг-пиксели), заголовки
 *   понижаются до жирного абзаца, одиночный перенос строки = `<br>`;
 * - `trusted: true` — документы с бэкенда (Legal): сырой HTML разрешён, отдельно
 *   пропускается через DOMPurify. Если документ уже готовый HTML (блочные теги),
 *   парсер Markdown не трогает его вовсе — иначе отступы/пустые строки внутри HTML
 *   превращались бы в code-блоки.
 *
 * В обоих режимах результат прогоняется через DOMPurify — результат безопасен для
 * dangerouslySetInnerHTML.
 */

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const userMarked = new Marked({ gfm: true, breaks: true });
userMarked.use({
    renderer: {
        html: ({ text }) => escapeHtml(text),
        image: ({ text }) => escapeHtml(text),
        heading(token) {
            return `<p><strong>${this.parser.parseInline(token.tokens)}</strong></p>\n`;
        },
    },
});

const trustedMarked = new Marked({ gfm: true });

const USER_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const BLOCK_HTML_RE = /<\/?(p|div|h[1-6]|ul|ol|li|table|section|article|br)\b/i;

// Внешние ссылки — в новой вкладке и без передачи opener/referrer.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
});

export interface RenderMarkdownOptions {
    /** Текст с бэкенда: разрешить сырой HTML (всё равно санитизируется). */
    trusted?: boolean;
}

export const renderMarkdown = (text: string | null | undefined, options: RenderMarkdownOptions = {}): string => {
    const source = (text ?? '').replace(/\r\n?/g, '\n').trim();
    if (!source) return '';

    if (options.trusted) {
        const html = BLOCK_HTML_RE.test(source) ? source : (trustedMarked.parse(source, { async: false }) as string);
        return DOMPurify.sanitize(html);
    }

    const html = userMarked.parse(source, { async: false }) as string;
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: USER_ALLOWED_TAGS, ALLOWED_ATTR: ['href', 'title'] });
};
