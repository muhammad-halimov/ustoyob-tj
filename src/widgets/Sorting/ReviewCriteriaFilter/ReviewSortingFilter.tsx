import { useTranslation } from 'react-i18next';
import styles from '../CriteriaFilter/SortingFilter.module.scss';
import toggleStyles from '../TypeFilter/ServiceTypeFilter.module.scss';

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

    return (
        <div className={styles.sort_filter_block}>
            <div className={styles.sort_filter_item}>
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

            <div className={styles.sort_filter_item}>
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

            <div className={styles.sort_filter_item} style={{ justifyContent: 'flex-end' }}>
                <label>{t('reviewSorting.withPhotos')}</label>
                <label className={toggleStyles.switch}>
                    <input
                        type="checkbox"
                        checked={withPhotosOnly}
                        onChange={onWithPhotosToggle}
                    />
                    <span className={toggleStyles.slider}></span>
                </label>
            </div>
        </div>
    );
};
