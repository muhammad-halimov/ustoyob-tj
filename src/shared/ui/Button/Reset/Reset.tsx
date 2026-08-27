import type * as React from 'react';
import styles from './Reset.module.scss';

interface ResetButtonProps {
    /** Button label, e.g. t('sorting.reset') — kept caller-side since it differs per translation namespace */
    label: string;
    className?: string;
    onClick: () => void;
    disabled?: boolean;
    /**
     * Кастомная иконка вместо стрелки-рестарта по умолчанию — например, значок
     * корзинки для "удалить всё". Рендерится как есть (размер/цвет — на совести вызывающего).
     */
    altIcon?: React.ReactNode;
}

/**
 * Shared "reset filters" button (circular-arrow icon + label).
 * Extracted from the copy-pasted reset button in widgets/Sorting/* filter panels.
 */
export function Reset({ label, className, onClick, disabled, altIcon }: ResetButtonProps) {
    return (
        <button
            type="button"
            className={`${styles.resetBtn} ${className ?? ''}`}
            onClick={onClick}
            disabled={disabled}
        >
            {altIcon ?? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.51 15C4.15839 16.8404 5.38734 18.4202 7.01166 19.5014C8.63598 20.5826 10.5677 21.1066 12.5157 20.9945C14.4637 20.8824 16.3226 20.1402 17.8121 18.8798C19.3017 17.6193 20.3413 15.909 20.7742 14.0064C21.2072 12.1037 21.0101 10.112 20.2126 8.33111C19.4152 6.55025 18.0605 5.07686 16.3528 4.13077C14.6451 3.18469 12.6769 2.81662 10.7447 3.08098C8.81245 3.34534 7.02091 4.22637 5.64 5.59L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            )}
            {label}
        </button>
    );
}
