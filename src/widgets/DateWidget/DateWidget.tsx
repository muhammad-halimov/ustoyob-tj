import React from 'react';
import styles from './DateWidget.module.scss';

interface DateInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    /** Max selectable date as ISO string (YYYY-MM-DD). Defaults to 16 years ago. */
    max?: string;
    /** Min selectable date as ISO string (YYYY-MM-DD). */
    min?: string;
    /** Label text shown above the input. */
    label?: string;
    /** Placeholder-like label when no value is set. */
    placeholder?: string;
    name?: string;
    className?: string;
}

const defaultMax = () =>
    new Date(new Date().setFullYear(new Date().getFullYear() - 16))
        .toISOString()
        .split('T')[0];

export const DateWidget: React.FC<DateInputProps> = ({
    value,
    onChange,
    disabled,
    max,
    min,
    label,
    placeholder,
    name = 'dateOfBirth',
    className,
}) => {
    return (
        <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
            {label && <span className={styles.label}>{label}</span>}
            <input
                type="date"
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                max={max ?? defaultMax()}
                min={min}
                placeholder={placeholder}
                className={styles.input}
            />
        </div>
    );
};
