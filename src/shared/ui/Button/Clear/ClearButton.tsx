import styles from './ClearButton.module.scss';

interface ClearButtonProps {
    className?: string;
    onClick: () => void;
}

export function ClearButton({ className, onClick }: ClearButtonProps) {
    return (
        <button
            type="button"
            aria-label="Clear"
            className={`${styles.clearBtn} ${className ?? ''}`}
            onClick={onClick}
        >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        </button>
    );
}
