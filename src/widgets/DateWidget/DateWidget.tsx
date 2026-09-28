import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFormattedDate } from '../../hooks';
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
    const { t } = useTranslation('components');
    // formatLocalizedDate('') возвращает "дата не указана" — для пустого поля нужен свой
    // плейсхолдер, поэтому форматированное значение используем только при непустом value.
    const formattedValue = useFormattedDate(value);
    const emptyPlaceholder = placeholder ?? t('dateOfBirth');

    return (
        <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.inputBox}>
                <input
                    type="date"
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    max={max ?? defaultMax()}
                    min={min}
                    className={styles.input}
                    aria-label={emptyPlaceholder}
                />
                {/*
                    Только для iOS (см. @supports в scss, на остальных платформах скрыт): нативный
                    <input type="date"> в WebKit рисует пустое значение как сегодняшнюю дату
                    блёклым системным шрифтом по центру — выглядит как уже выбранная дата и не
                    похоже на остальные поля формы. Его собственный текст там прозрачный, а
                    реальный (плейсхолдер или отформатированная дата) рисует этот оверлей;
                    тапы проходят сквозь него (pointer-events: none) в сам инпут → нативный пикер.
                */}
                <span
                    className={`${styles.display}${!value ? ` ${styles.placeholder}` : ''}`}
                    data-date-display
                    aria-hidden="true"
                >
                    {value ? formattedValue : emptyPlaceholder}
                </span>
            </div>
        </div>
    );
};
