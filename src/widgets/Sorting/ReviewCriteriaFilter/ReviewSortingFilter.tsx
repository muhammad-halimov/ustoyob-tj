import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../CriteriaFilter/SortingFilter.module.scss';
import { Toggle } from '../../../shared/ui/Button/Toggle/Toggle';
import { Reset } from '../../../shared/ui/Button/Reset/Reset';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import type { ReviewSortByType, ReviewTimeFilterType } from '../../../types/common';
export type { ReviewSortByType, ReviewTimeFilterType };

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

    const handleReset = () => {
        onSortChange('newest');
        onTimeFilterChange('all');
        if (withPhotosOnly) onWithPhotosToggle();
    };

    return (
        <div className={styles.sort_filter_block}>
            <button className={styles.toggle_btn} onClick={() => setOpen(v => !v)} type="button">
                <span>{t('reviewSorting.title')}</span>
                <span className={styles.toggle_icon}>{open ? '▽' : '▷'}</span>
            </button>
            {open && (
                <div className={styles.sort_filter_items}>
            <div className={styles.sort_filter_item} style={{ flex: '45 1 0' }}>
                <label>{t('reviewSorting.sort')}</label>
                <SelectSearch
                    noSearch
                    hideClear
                    value={sortBy}
                    onChange={(value) => onSortChange(value as ReviewSortByType)}
                    options={[
                        { value: 'newest', label: t('reviewSorting.newest') },
                        { value: 'oldest', label: t('reviewSorting.oldest') },
                        { value: 'rating-high', label: t('reviewSorting.ratingHigh') },
                        { value: 'rating-low', label: t('reviewSorting.ratingLow') },
                    ]}
                />
            </div>

            <div className={styles.sort_filter_item} style={{ flex: '45 1 0' }}>
                <label>{t('reviewSorting.timePeriod')}</label>
                <SelectSearch
                    noSearch
                    hideClear
                    value={timeFilter}
                    onChange={(value) => onTimeFilterChange(value as ReviewTimeFilterType)}
                    options={[
                        { value: 'all', label: t('reviewSorting.all') },
                        { value: 'today', label: t('reviewSorting.today') },
                        { value: 'yesterday', label: t('reviewSorting.yesterday') },
                        { value: 'week', label: t('reviewSorting.week') },
                        { value: 'month', label: t('reviewSorting.month') },
                    ]}
                />
            </div>

            <div className={styles.sort_filter_item} style={{ flex: '10 1 0', minWidth: 'unset' }}>
                <label>{t('reviewSorting.withPhotos')}</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                    <Toggle checked={withPhotosOnly} onChange={onWithPhotosToggle} />
                </div>
            </div>

            <div className={styles.sort_filter_footer}>
                <Reset label={t('reviewSorting.reset')} onClick={handleReset} />
            </div>
            </div>
            )}
        </div>
    );
};
