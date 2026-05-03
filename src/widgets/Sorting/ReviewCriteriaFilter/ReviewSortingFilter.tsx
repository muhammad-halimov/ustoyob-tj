import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../CriteriaFilter/SortingFilter.module.scss';
import { Toggle } from '../../../shared/ui/Button/Toggle/Toggle';

export type ReviewSortByType = 'newest' | 'oldest' | 'rating-high' | 'rating-low';
export type ReviewTimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

interface ReviewSortingFilterProps {
    sortBy: ReviewSortByType;
    timeFilter: ReviewTimeFilterType;
    withPhotosOnly: boolean;
    onSortChange: (value: ReviewSortByType) => void;
    onTimeFilterChange: (value: ReviewTimeFilterType) => void;
    onWithPhotosToggle: () => void;
}

export const ReviewSortingFilter = ({
    sortBy,
    timeFilter,
    withPhotosOnly,
    onSortChange,
    onTimeFilterChange,
    onWithPhotosToggle,
}: ReviewSortingFilterProps) => {
    const { t } = useTranslation('profile');
    const [open, setOpen] = useState(false);

    return (
        <div className={styles.sort_filter_block}>
            <button className={styles.toggle_btn} onClick={() => setOpen(v => !v)} type="button">
                <span>{t('reviewSorting.title')}</span>
                <span className={styles.toggle_icon}>{open ? '▽' : '▷'}</span>
            </button>
            {open && (
                <div className={styles.sort_filter_items}>
            <div className={styles.sort_filter_item} style={{ flex: '45 1 0' }}>
                <label htmlFor="reviewSortBy">{t('reviewSorting.sort')}</label>
                <select
                    id="reviewSortBy"
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as ReviewSortByType)}
                    className={styles.select}
                >
                    <option value="newest">{t('reviewSorting.newest')}</option>
                    <option value="oldest">{t('reviewSorting.oldest')}</option>
                    <option value="rating-high">{t('reviewSorting.ratingHigh')}</option>
                    <option value="rating-low">{t('reviewSorting.ratingLow')}</option>
                </select>
            </div>

            <div className={styles.sort_filter_item} style={{ flex: '45 1 0' }}>
                <label htmlFor="reviewTimeFilter">{t('reviewSorting.timePeriod')}</label>
                <select
                    id="reviewTimeFilter"
                    value={timeFilter}
                    onChange={(e) => onTimeFilterChange(e.target.value as ReviewTimeFilterType)}
                    className={styles.select}
                >
                    <option value="all">{t('reviewSorting.all')}</option>
                    <option value="today">{t('reviewSorting.today')}</option>
                    <option value="yesterday">{t('reviewSorting.yesterday')}</option>
                    <option value="week">{t('reviewSorting.week')}</option>
                    <option value="month">{t('reviewSorting.month')}</option>
                </select>
            </div>

            <div className={styles.sort_filter_item} style={{ flex: '10 1 0', minWidth: 'unset' }}>
                <label>{t('reviewSorting.withPhotos')}</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                    <Toggle checked={withPhotosOnly} onChange={onWithPhotosToggle} />
                </div>
            </div>
            </div>
            )}
        </div>
    );
};
