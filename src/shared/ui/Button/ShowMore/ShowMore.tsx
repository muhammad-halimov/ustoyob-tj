import { useState, useEffect, useRef } from 'react';
import styles from './ShowMore.module.scss';
import { Clear } from '../Clear/Clear';
import { PageLoader } from '../../../../widgets/PageLoader';
import { Marquee } from '../../Text/Marquee/Marquee';

/**
 * Компонент ShowMore отображает компактный блок для разворачивания или
 * сворачивания длинных списков с опциональной кнопкой очистки.
 *
 * Сохраняет стабильность макета при сворачивании и поддерживает состояния
 * загрузки для действий «показать еще» и «показать меньше».
 */
interface ShowMoreProps {
    /** Текущее состояние развёрнутости */
    expanded: boolean;
    /** Явный флаг, что можно загрузить ещё элементы */
    canLoadMore?: boolean;
    /** Запасной флаг наличия дополнительных элементов */
    hasMore?: boolean;
    /** Обработчик для показа большего количества элементов */
    onShowMore: () => void;
    /** Обработчик для сворачивания содержимого */
    onShowLess: () => void;
    /** Обработчик для очистки / сброса */
    onClear: () => void;
    /** Текст для кнопки «показать еще» */
    showMoreText: string;
    /** Текст для кнопки «показать меньше» */
    showLessText: string;
    /** Показывать ли кнопку очистки */
    clearBtn?: boolean;
    /** Состояние загрузки для действий больше/меньше */
    loading?: boolean;
    /** Вертикальное расположение кнопок */
    column?: boolean;
}

export const ShowMore = ({ expanded, canLoadMore, hasMore, onShowMore, onShowLess, onClear, showMoreText, showLessText, clearBtn = true, loading = false, column = false }: ShowMoreProps) => {
    const [clicked, setClicked] = useState<'more' | 'less' | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const resolvedCanLoadMore = canLoadMore !== undefined
        ? canLoadMore
        : (hasMore ?? false);

    useEffect(() => {
        if (!loading) setClicked(null);
    }, [loading]);

    if (!resolvedCanLoadMore && !expanded) return null;

    const handleShowMore = () => {
        setClicked('more');
        onShowMore();
    };

    const handleShowLess = () => {
        const wrapper = wrapperRef.current;
        const prevTop = wrapper?.getBoundingClientRect().top ?? 0;
        setClicked('less');
        onShowLess();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const newTop = wrapper?.getBoundingClientRect().top ?? 0;
                window.scrollBy({ top: newTop - prevTop, behavior: 'instant' });
            });
        });
    };

    const moreLoading = loading && clicked === 'more';
    const lessLoading = loading && clicked === 'less';

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <div className={styles.outer}>
                <div className={`${styles.row}${column ? ` ${styles.rowColumn}` : ''}`}>
                    {resolvedCanLoadMore && (
                        <button className={styles.btn} onClick={handleShowMore} disabled={loading}>
                            {moreLoading ? <PageLoader fullPage={false} compact primary={false} /> : (
                                <span className={styles.btnText}>
                                    <span className={styles.btnLabel}>
                                        <Marquee text={showMoreText} />
                                    </span>
                                    <span className={styles.icon}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                </span>
                            )}
                        </button>
                    )}
                    {(expanded || lessLoading) && (
                        <button className={styles.btn} onClick={handleShowLess} disabled={loading}>
                            {lessLoading ? <PageLoader fullPage={false} compact primary={false} /> : (
                                <span className={styles.btnText}>
                                    <span className={styles.btnLabel}>
                                        <Marquee text={showLessText} />
                                    </span>
                                    <span className={styles.icon}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                </span>
                            )}
                        </button>
                    )}
                </div>
                {clearBtn && expanded && <Clear onClick={onClear} />}
            </div>
        </div>
    );
};

