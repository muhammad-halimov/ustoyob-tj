import { useTranslation } from 'react-i18next';
import styles from './SortingFilter.module.scss';

type SortByType = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc';
type SecondarySortByType = 'none' | SortByType;
type TimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

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

    return (
        <div className={styles.sort_filter_block}>
            <div className={styles.sort_filter_item}>
                <label htmlFor="sortBy">{t('sorting.primarySort')}</label>
                <select
                    id="sortBy"
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as SortByType)}
                    className={styles.select}
                >
                    <option value="newest">{t('sorting.newest')}</option>
                    <option value="oldest">{t('sorting.oldest')}</option>
                    <option value="price-asc">{t('sorting.priceAsc')}</option>
                    <option value="price-desc">{t('sorting.priceDesc')}</option>
                    <option value="reviews-asc">{t('sorting.reviewsAsc')}</option>
                    <option value="reviews-desc">{t('sorting.reviewsDesc')}</option>
                    <option value="rating-asc">{t('sorting.ratingAsc')}</option>
                    <option value="rating-desc">{t('sorting.ratingDesc')}</option>
                </select>
            </div>

            <div className={styles.sort_filter_item}>
                <label htmlFor="secondarySortBy">{t('sorting.secondarySort')}</label>
                <select
                    id="secondarySortBy"
                    value={secondarySortBy}
                    onChange={(e) => onSecondarySortChange(e.target.value as SecondarySortByType)}
                    className={styles.select}
                >
                    <option value="none">{t('sorting.none')}</option>
                    <option value="newest">{t('sorting.newest')}</option>
                    <option value="oldest">{t('sorting.oldest')}</option>
                    <option value="price-asc">{t('sorting.priceAsc')}</option>
                    <option value="price-desc">{t('sorting.priceDesc')}</option>
                    <option value="reviews-asc">{t('sorting.reviewsAsc')}</option>
                    <option value="reviews-desc">{t('sorting.reviewsDesc')}</option>
                    <option value="rating-asc">{t('sorting.ratingAsc')}</option>
                    <option value="rating-desc">{t('sorting.ratingDesc')}</option>
                </select>
            </div>

            <div className={styles.sort_filter_item}>
                <label htmlFor="timeFilter">{t('sorting.timePeriod')}</label>
                <select
                    id="timeFilter"
                    value={timeFilter}
                    onChange={(e) => onTimeFilterChange(e.target.value as TimeFilterType)}
                    className={styles.select}
                >
                    <option value="all">{t('sorting.all')}</option>
                    <option value="today">{t('sorting.today')}</option>
                    <option value="yesterday">{t('sorting.yesterday')}</option>
                    <option value="week">{t('sorting.week')}</option>
                    <option value="month">{t('sorting.month')}</option>
                </select>
            </div>
        </div>
    );
};
