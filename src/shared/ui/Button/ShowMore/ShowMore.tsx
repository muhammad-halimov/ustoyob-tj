import { useState, useEffect, useRef } from 'react';
import styles from './ShowMore.module.scss';
import { Clear } from '../Clear/Clear';
import { PageLoader } from '../../../../widgets/PageLoader';

interface ShowMoreProps {
    expanded: boolean;
    canLoadMore: boolean;
    onShowMore: () => void;
    onShowLess: () => void;
    onClear: () => void;
    showMoreText: string;
    showLessText: string;
    clearBtn?: boolean;
    loading?: boolean;
}

export const ShowMore = ({ expanded, canLoadMore, onShowMore, onShowLess, onClear, showMoreText, showLessText, clearBtn = true, loading = false }: ShowMoreProps) => {
    const [clicked, setClicked] = useState<'more' | 'less' | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading) setClicked(null);
    }, [loading]);

    if (!canLoadMore && !expanded && !loading) return null;

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
            <div className={styles.row}>
                {(canLoadMore || moreLoading) && (
                    <button className={styles.btn} onClick={handleShowMore} disabled={loading}>
                        <span className={styles.btnInner}>
                            <span className={styles.btnText} style={{ visibility: moreLoading ? 'hidden' : 'visible' }}>
                                {showMoreText}
                                <span className={styles.icon}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </span>
                            </span>
                            {moreLoading && (
                                <span className={styles.btnLoader}>
                                    <PageLoader fullPage={false} compact asSpan />
                                </span>
                            )}
                        </span>
                    </button>
                )}
                {(expanded || lessLoading) && (
                    <>
                        <button className={styles.btn} onClick={handleShowLess} disabled={loading}>
                            <span className={styles.btnInner}>
                                <span className={styles.btnText} style={{ visibility: lessLoading ? 'hidden' : 'visible' }}>
                                    {showLessText}
                                    <span className={styles.icon}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                </span>
                                {lessLoading && (
                                    <span className={styles.btnLoader}>
                                        <PageLoader fullPage={false} compact asSpan />
                                    </span>
                                )}
                            </span>
                        </button>
                        {clearBtn && <Clear onClick={onClear} />}
                    </>
                )}
            </div>
        </div>
    );
};

