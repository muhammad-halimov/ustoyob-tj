import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './DateWidget.module.scss';

interface DateInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    /** Max selectable date as ISO string (YYYY-MM-DD). Defaults to 16 years ago. */
    max?: string;
    /** Min selectable date as ISO string (YYYY-MM-DD). Defaults to 100 years before max. */
    min?: string;
    /** Label text shown above the input. */
    label?: string;
    /** Placeholder-like aria-label when no value is set. */
    placeholder?: string;
    name?: string;
    className?: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const defaultMax = () =>
    new Date(new Date().setFullYear(new Date().getFullYear() - 16))
        .toISOString()
        .split('T')[0];

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const splitValue = (value: string): [string, string, string] =>
    value ? (value.split('-') as [string, string, string]) : ['', '', ''];

/**
 * День/месяц/год тремя обычными <select> вместо нативного <input type="date">.
 *
 * Почему: нативный date-input оказался неисправимо капризным сразу на нескольких платформах,
 * и каждый следующий CSS-фикс упирался в новый нативный баг вместо решения предыдущего —
 * пустое значение рисуется как СЕГОДНЯШНЯЯ дата (десктопный Chrome и мобильные WebKit/
 * Chromium одинаково — Auth.tsx: dateOfBirth изначально ''), у iOS вдобавок своя минимальная
 * ширина по содержимому (переполняет форму) и схлопывающаяся высота при appearance:none, а
 * подсветка активного сегмента при фокусе/открытом пикере рисуется браузером НЕЗАВИСИМО от
 * наших цветов — перекрывалась с любым overlay, который мы пытались нарисовать поверх.
 * Три select'а не имеют ни одной из этих особенностей ни на одной платформе — обычные,
 * предсказуемые элементы форм, требующие только своей стилизации под соседние поля.
 *
 * Веб (ветка front) вместо этого оставил обычный нативный date-input — для десктопных
 * посетителей эти баги менее ощутимы, а простой input дешевле поддерживать.
 */
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

    // Собственное состояние для трёх кусочков, а НЕ производное напрямую от value на каждый
    // рендер: value — это единая ISO-строка, целостная только когда выбраны все три select'а.
    // Если держать её единственным источником истины, то после выбора, скажем, дня — value
    // остаётся '' (день сам по себе не дата), onChange('') летит родителю, тот возвращает
    // прежний value='' пропом, и React управляемо откатывает day select обратно на плейсхолдер
    // раньше, чем пользователь успеет выбрать месяц. С локальным стейтом частичный выбор
    // просто живёт здесь, пока не наберутся все три части.
    const [day, setDay] = useState(() => splitValue(value)[2]);
    const [month, setMonth] = useState(() => splitValue(value)[1]);
    const [year, setYear] = useState(() => splitValue(value)[0]);

    // Синхронизация при внешнем изменении value (загрузка профиля, сброс формы и т.п.) —
    // НЕ реагирует на изменения, инициированные самим этим компонентом (onChange здесь всегда
    // приходит уже полностью собранной датой или '', оба случая идемпотентны при повторном
    // разборе тем же split, так что лишний ререндер безопасен).
    useEffect(() => {
        const [y, m, d] = splitValue(value);
        setYear(y);
        setMonth(m);
        setDay(d);
    }, [value]);

    const maxDate = max ?? defaultMax();
    const maxYear = Number(maxDate.slice(0, 4)) || new Date().getFullYear();
    const minYear = min ? Number(min.slice(0, 4)) : maxYear - 100;

    const months = useMemo(() => {
        const list = t('time.months', { returnObjects: true });
        return Array.isArray(list) ? (list as string[]) : [];
    }, [t]);

    const years = useMemo(() => {
        const arr: number[] = [];
        for (let y = maxYear; y >= minYear; y--) arr.push(y);
        return arr;
    }, [maxYear, minYear]);

    const ariaLabel = placeholder ?? t('auth.dateOfBirth');

    const emit = (nextDay: string, nextMonth: string, nextYear: string) => {
        setDay(nextDay);
        setMonth(nextMonth);
        setYear(nextYear);

        if (nextDay && nextMonth && nextYear) {
            // Клэмп на случай "31 февраля" (в дне выбор всегда 1–31 независимо от месяца) —
            // подстраиваем под реально существующий день этого месяца/года, а не роняем выбор.
            const clampedDay = Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth)));
            onChange(`${nextYear}-${nextMonth}-${pad2(clampedDay)}`);
        } else if (value) {
            // Дата была полной, а теперь одну из частей сбросили обратно на плейсхолдер —
            // сообщаем родителю, что цельного значения больше нет. Если value и так уже '' —
            // лишний вызов не нужен, там нечего уточнять.
            onChange('');
        }
    };

    return (
        <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.row}>
                <select
                    name={`${name}-day`}
                    className={`${styles.select}${!day ? ` ${styles.empty}` : ''}`}
                    value={day}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => emit(e.target.value, month, year)}
                >
                    <option value="">{t('auth.dobDay')}</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={pad2(d)}>{d}</option>
                    ))}
                </select>
                <select
                    name={`${name}-month`}
                    className={`${styles.select} ${styles.selectMonth}${!month ? ` ${styles.empty}` : ''}`}
                    value={month}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => emit(day, e.target.value, year)}
                >
                    <option value="">{t('auth.dobMonth')}</option>
                    {months.map((monthName, i) => (
                        <option key={monthName} value={pad2(i + 1)}>{monthName}</option>
                    ))}
                </select>
                <select
                    name={`${name}-year`}
                    className={`${styles.select}${!year ? ` ${styles.empty}` : ''}`}
                    value={year}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => emit(day, month, e.target.value)}
                >
                    <option value="">{t('auth.dobYear')}</option>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
