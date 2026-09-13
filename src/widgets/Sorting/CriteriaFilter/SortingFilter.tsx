import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SortingFilter.module.scss';
import { Reset } from '../../../shared/ui/Button/Reset/Reset';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import type { SortByType, SecondarySortByType, TimeFilterType } from '../../../types/common';

interface SortingFilterProps {
    sortBy: SortByType;
    secondarySortBy: SecondarySortByType;
    timeFilter: TimeFilterType;
    onSortChange: (value: SortByType) => void;
    onSecondarySortChange: (value: SecondarySortByType) => void;
    onTimeFilterChange: (value: TimeFilterType) => void;
}

export const SortingFilter = ({
    sortBy,
    secondarySortBy,
    timeFilter,
    onSortChange,
    onSecondarySortChange,
    onTimeFilterChange
}: SortingFilterProps) => {
    const { t } = useTranslation('category');
    const [open, setOpen] = useState(false);

    const handleReset = () => {
        onSortChange('newest');
        onSecondarySortChange('none');
        onTimeFilterChange('all');
    };

    return (
        <div className={styles.sort_filter_block}>
            <button className={styles.toggle_btn} onClick={() => setOpen(v => !v)} type="button">
                <span>{t('sorting.title')}</span>
                <span className={styles.toggle_icon}>{open ? '▽' : '▷'}</span>
            </button>
            {open && (
                <div className={styles.sort_filter_items}>
            <div className={styles.sort_filter_item}>
                <label>{t('sorting.primarySort')}</label>
                <SelectSearch
                    noSearch
                    hideClear
                    value={sortBy}
                    onChange={(value) => onSortChange(value as SortByType)}
                    options={[
                        { value: 'newest', label: t('sorting.newest') },
                        { value: 'oldest', label: t('sorting.oldest') },
                        { value: 'price-asc', label: t('sorting.priceAsc') },
                        { value: 'price-desc', label: t('sorting.priceDesc') },
                        { value: 'reviews-asc', label: t('sorting.reviewsAsc') },
                        { value: 'reviews-desc', label: t('sorting.reviewsDesc') },
                        { value: 'rating-asc', label: t('sorting.ratingAsc') },
                        { value: 'rating-desc', label: t('sorting.ratingDesc') },
                    ]}
                />
            </div>

            <div className={styles.sort_filter_item}>
                <label>{t('sorting.secondarySort')}</label>
                <SelectSearch
                    noSearch
                    hideClear
                    value={secondarySortBy}
                    onChange={(value) => onSecondarySortChange(value as SecondarySortByType)}
                    options={[
                        { value: 'none', label: t('sorting.none') },
                        { value: 'newest', label: t('sorting.newest') },
                        { value: 'oldest', label: t('sorting.oldest') },
                        { value: 'price-asc', label: t('sorting.priceAsc') },
                        { value: 'price-desc', label: t('sorting.priceDesc') },
                        { value: 'reviews-asc', label: t('sorting.reviewsAsc') },
                        { value: 'reviews-desc', label: t('sorting.reviewsDesc') },
                        { value: 'rating-asc', label: t('sorting.ratingAsc') },
                        { value: 'rating-desc', label: t('sorting.ratingDesc') },
                    ]}
                />
            </div>

            <div className={styles.sort_filter_item}>
                <label>{t('sorting.timePeriod')}</label>
                <SelectSearch
                    noSearch
                    hideClear
                    value={timeFilter}
                    onChange={(value) => onTimeFilterChange(value as TimeFilterType)}
                    options={[
                        { value: 'all', label: t('sorting.all') },
                        { value: 'today', label: t('sorting.today') },
                        { value: 'yesterday', label: t('sorting.yesterday') },
                        { value: 'week', label: t('sorting.week') },
                        { value: 'month', label: t('sorting.month') },
                    ]}
                />
            </div>

            <div className={styles.sort_filter_footer}>
                <Reset label={t('sorting.reset')} onClick={handleReset} />
            </div>
            </div>
            )}
        </div>
    );
};
