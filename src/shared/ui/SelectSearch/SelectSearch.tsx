import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { Marquee } from '../Text/Marquee';
import PageLoader from '../../../widgets/PageLoader/PageLoader';
import { Clear } from '../Button/Clear/Clear';
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
    /** onWheel для altMode input — например, снять фокус у type="number", чтобы скролл мыши не менял значение. */
    onWheel?: React.WheelEventHandler<HTMLInputElement>;
    /** onFocus для altMode input — вызывается вместе с внутренней логикой (снятие blur-маскировки) */
    onFocus?: () => void;
    /** onBlur для altMode input — вызывается вместе с внутренней логикой (blur-маскировка) */
    onBlur?: () => void;
    /** Показывает спиннер загрузки вместо триггера */
    loading?: boolean;
    /**
     * Альтернативный режим: скрывает дропдаун и рендерит
     * обычный текстовый input с иконкой поиска и кнопкой очистки.
     */
    altMode?: boolean;
    /**
     * Кастомная иконка для altMode вместо лупы по умолчанию — например, значок
     * денег для поля цены. Рендерится как есть (размер/цвет — на совести вызывающего).
     */
    altIcon?: React.ReactNode;
    /**
     * Скрывает кнопку очистки (×) даже когда value непустой — для полей, у которых
     * value никогда не бывает по-настоящему "пустым" по смыслу (например, номер
     * телефона всегда содержит хотя бы префикс "+992"), и очистка не имеет смысла.
     */
    hideClear?: boolean;
    /**
     * Скрывает поле поиска внутри дропдауна — для коротких списков (2-3 варианта),
     * где поиск не нужен и только занимает место.
     */
    noSearch?: boolean;
    /** Скрывает иконку слева в altMode — для полей без сопутствующей иконки (имя, email, пароль). */
    hideIcon?: boolean;
    /** Нативный type для input в altMode ('text' | 'email' | 'tel' и т.п.). Игнорируется при isPassword. По умолчанию 'text'. */
    inputType?: string;
    /**
     * Режим пароля для altMode: input переключается между type="password"/"text" через
     * встроенную кнопку-глаз (вместо кнопки очистки) и не показывает значение в
     * замаркированном (blurred) оверлее — иначе пароль был бы виден в открытом виде,
     * пока поле не в фокусе.
     */
    isPassword?: boolean;
    /** name для input в altMode — нужен для автозаполнения браузера и менеджеров паролей. */
    name?: string;
    /** autoComplete для input в altMode (например "new-password", "current-password", "email"). */
    autoComplete?: string;
    /** required для input в altMode — нативная валидация работает и здесь, инпут остаётся настоящим и видимым. */
    required?: boolean;
    /** maxLength для input в altMode. */
    maxLength?: number;
    /** minLength для input в altMode. */
    minLength?: number;
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
    altIcon,
    hideClear = false,
    noSearch = false,
    hideIcon = false,
    inputType = 'text',
    isPassword = false,
    name,
    autoComplete,
    required,
    maxLength,
    minLength,
    loading = false,
    onKeyDown,
    onWheel,
    onFocus,
    onBlur,
}: SelectSearchProps<T>) {
    const { t } = useTranslation('common');
    const resolvedPlaceholder = placeholder ?? t('select');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search');
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [altFocused, setAltFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
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
        if (open && !noSearch) {
            setTimeout(() => searchRef.current?.focus(), 0);
        }
    }, [open, noSearch]);

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

    const handleClear = useCallback(() => {
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

    if (loading) {
        return (
            <div className={`${styles.wrapper} ${styles.disabled} ${className ?? ''}`}>
                <div className={styles.trigger} style={{ pointerEvents: 'none' }}>
                    <PageLoader fullPage={false} compact />
                </div>
            </div>
        );
    }

    if (altMode) {
        return (
            <div
                ref={containerRef}
                className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
            >
                <div className={styles.altWrap}>
                    {!hideIcon && (altIcon ? (
                        <span className={styles.altSearchIcon}>{altIcon}</span>
                    ) : (
                        <svg className={styles.altSearchIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                    ))}
                    <div className={styles.altInputWrap}>
                        <input
                            type={isPassword ? (passwordVisible ? 'text' : 'password') : inputType}
                            className={`${styles.altInput} ${value && !altFocused && !isPassword ? styles.altInputBlurred : ''}`}
                            // В обычном режиме плейсхолдер рисует Marquee-оверлей ниже (умеет
                            // скроллить длинный текст) — тут placeholder пустой, чтобы не дублировать.
                            // Для пароля оверлей не рендерится (см. ниже), поэтому нужен нативный.
                            placeholder={isPassword ? resolvedPlaceholder : ''}
                            value={value}
                            disabled={disabled}
                            name={name}
                            autoComplete={autoComplete}
                            required={required}
                            maxLength={maxLength}
                            minLength={minLength}
                            onChange={e => onChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            onWheel={onWheel}
                            onFocus={() => { setAltFocused(true); onFocus?.(); }}
                            onBlur={() => { setAltFocused(false); onBlur?.(); }}
                        />
                        {/* Оверлей с плейсхолдером/значением скрыт для пароля — иначе он показал бы
                            символы пароля открытым текстом поверх замаркированного инпута. */}
                        {!altFocused && !isPassword && (
                            <div className={styles.altPlaceholder}>
                                <Marquee text={value || resolvedPlaceholder} alwaysScroll={!!value} />
                            </div>
                        )}
                    </div>
                    {isPassword ? (
                        <Clear
                            ariaLabel={passwordVisible ? t('hidePassword') : t('showPassword')}
                            className={styles.clearBtn}
                            onClick={() => setPasswordVisible(v => !v)}
                            icon={passwordVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
                        />
                    ) : (
                        // Кнопка держится в DOM всегда (когда !hideClear), просто прячется через
                        // visibility — если монтировать/размонтировать её по наличию value, ширина
                        // flex-строки altWrap меняется в момент первого же символа, и текст/курсор
                        // дёргается влево.
                        !hideClear && (
                            <Clear
                                ariaLabel={t('clear')}
                                className={`${styles.clearBtn} ${value && !disabled ? '' : styles.clearBtnHidden}`}
                                onClick={() => onChange('')}
                            />
                        )
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
            {/* Триггер. div вместо button — чтобы кнопка Clear (см. ниже) могла
                валидно вкладываться внутрь (button внутри button недопустим в HTML). */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled || undefined}
                className={styles.trigger}
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
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
                {/* См. комментарий у altMode-варианта этой кнопки — держим в DOM, прячем
                    через visibility, чтобы выбор/сброс опции не сдвигал ширину лейбла. */}
                {!hideClear && (
                    <Clear
                        ariaLabel={t('clear')}
                        className={`${styles.clearBtn} ${value && !disabled ? '' : styles.clearBtnHidden}`}
                        onClick={handleClear}
                    />
                )}
                <svg
                    className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>

            {/* Дропдаун */}
            {open && (
                <div className={styles.dropdown} role="listbox">
                    {/* Поле поиска */}
                    {!noSearch && (
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
                    )}

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
