import styles from './Clear.module.scss';

interface ClearButtonProps {
    className?: string;
    onClick: () => void;
    /** Overrides the default "Clear" aria-label — pass a translated string where one is available */
    ariaLabel?: string;
}

export function Clear({ className, onClick, ariaLabel }: ClearButtonProps) {
    return (
        <button
            type="button"
            aria-label={ariaLabel ?? 'Clear'}
            className={`${styles.clearBtn} ${className ?? ''}`}
            // Keeps focus on whatever was focused before the click (e.g. a sibling input)
            // instead of the browser's default of moving focus onto this button.
            onMouseDown={(e) => e.preventDefault()}
            // Stops the click from bubbling to an ancestor's own onClick (e.g. a
            // SelectSearch trigger) when Clear is nested inside a larger clickable element.
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        </button>
    );
}
