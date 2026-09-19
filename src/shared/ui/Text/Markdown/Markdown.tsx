import { useMemo } from 'react';
import { renderMarkdown } from '../../../../utils/markdownUtils';
import styles from './Markdown.module.scss';

interface MarkdownProps {
    text?: string | null;
    /** Текст с бэкенда (Legal): разрешает сырой HTML, см. renderMarkdown. */
    trusted?: boolean;
    className?: string;
}

/**
 * Renders markdown as sanitised HTML. Typography inherits from the parent
 * (font-size/colour); base styles use :where() so a passed className always wins.
 */
export const Markdown = ({ text, trusted = false, className }: MarkdownProps) => {
    const html = useMemo(() => renderMarkdown(text, { trusted }), [text, trusted]);
    if (!html) return null;
    return (
        <div
            className={className ? `${styles.markdown} ${className}` : styles.markdown}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};
