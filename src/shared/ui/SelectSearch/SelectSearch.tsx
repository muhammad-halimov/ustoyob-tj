import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marquee } from '../Text/Marquee';
import styles from './SelectSearch.module.scss';

export interface SelectOption<T = unknown> {
    /** Уникальный идентификатор, хранится как значение */
    value: string;
    /** Текст для отображения в списке и поле */
    label: string;
    /** Исходный объект данных (опционально) */
    data?: T;
}

interface SelectSearchProps<T = unknown> {
    options: SelectOption<T>[];
    value: string;
    onChange: (value: string, option?: SelectOption<T>) => void;
    /** Плейсхолдер кнопки-триггера когда ничего не выбрано. По умолчанию берётся из переводов common:select */
    placeholder?: string;
    /** Плейсхолдер поля поиска внутри дропдауна. По умолчанию берётся из переводов common:search */
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
    /** Показывать иконку поиска в триггере */
    showSearchIcon?: boolean;
    /** onKeyDown для altMode input */
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    /**
     * Альтернативный режим: скрывает дропдаун и рендерит
     * обычный текстовый input с иконкой поиска и кнопкой очистки.
     */
    altMode?: boolean;
}

export function SelectSearch<T = unknown>({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    className,
    disabled = false,
    showSearchIcon = false,
    altMode = false,
    onKeyDown,
}: SelectSearchProps<T>) {
    const { t } = useTranslation('common');
    const resolvedPlaceholder = placeholder ?? t('select');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search');
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [altFocused, setAltFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(
        () => options.find(o => o.value === value) ?? null,
        [options, value],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, query]);

    // Закрытие по клику снаружи
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Фокус на поиск при открытии
    useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current?.focus(), 0);
        }
    }, [open]);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setOpen(v => {
            if (v) setQuery('');
            return !v;
        });
    }, [disabled]);

    const handleSelect = useCallback((option: SelectOption<T>) => {
        onChange(option.value, option);
        setOpen(false);
        setQuery('');
    }, [onChange]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('', undefined);
        setOpen(false);
        setQuery('');
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
        } else if (e.key === 'Enter' && filtered.length > 0) {
            handleSelect(filtered[0]);
        }
    }, [filtered, handleSelect]);

    if (altMode) {
        return (
            <div
                ref={containerRef}
                className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
            >
                <div className={styles.altWrap}>
                    <svg className={styles.altSearchIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <div className={styles.altInputWrap}>
                        <input
                            type="text"
                            className={`${styles.altInput} ${value && !altFocused ? styles.altInputBlurred : ''}`}
                            placeholder=""
                            value={value}
                            disabled={disabled}
                            onChange={e => onChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            onFocus={() => setAltFocused(true)}
                            onBlur={() => setAltFocused(false)}
                        />
                        {!altFocused && (
                            <div className={styles.altPlaceholder}>
                                <Marquee text={value || resolvedPlaceholder} alwaysScroll={!!value} />
                            </div>
                        )}
                    </div>
                    {value && !disabled && (
                        <span
                            role="button"
                            aria-label={t('clear')}
                            className={styles.clearBtn}
                            onMouseDown={e => { e.preventDefault(); onChange(''); }}
                        >
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.2"/>
                                <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${styles.wrapper} ${open ? styles.open : ''} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
        >
            {/* Триггер */}
            <button
                type="button"
                className={styles.trigger}
                onClick={handleToggle}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {showSearchIcon && !selectedOption && (
                    <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                )}
                <div className={`${styles.triggerLabel} ${!selectedOption ? styles.placeholder : ''}`}>
                    {selectedOption
                        ? <Marquee text={selectedOption.label} alwaysScroll/>
                        : resolvedPlaceholder
                    }
                </div>
                {value && !disabled && (
                    <span
                        role="button"
                        aria-label={t('clear')}
                        className={styles.clearBtn}
                        onMouseDown={handleClear}
                    >
                        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    </span>
                )}
                <svg
                    className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {/* Дропдаун */}
            {open && (
                <div className={styles.dropdown} role="listbox">
                    {/* Поле поиска */}
                    <div className={styles.searchWrap}>
                        <svg className={styles.searchIconInner} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder={resolvedSearchPlaceholder}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        {query && (
                            <button
                                type="button"
                                className={styles.searchClear}
                                onClick={() => setQuery('')}
                                aria-label={t('clearSearch')}
                            >
                                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Список вариантов */}
                    <ul className={styles.list}>
                        {filtered.length === 0 ? (
                            <li className={styles.empty}>{t('noResults')}</li>
                        ) : (
                            filtered.map(option => (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={option.value === value}
                                    className={`${styles.item} ${option.value === value ? styles.itemActive : ''}`}
                                    onMouseDown={() => handleSelect(option)}
                                >
                                    <Marquee text={option.label} alwaysScroll/>
                                    {option.value === value && (
                                        <svg className={styles.checkIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
