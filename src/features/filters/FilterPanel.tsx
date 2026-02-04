import styles from './FilterPanel.module.scss';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterState {
    minPrice: string;
    maxPrice: string;
    category: string;
    rating: string;
    reviewCount: string;
    sortBy: string;
    city: string; // Добавляем город
}

interface FilterPanelProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onFilterChange: (filters: FilterState) => void;
    filters: FilterState;
    onResetFilters: () => void;
    categories: { id: number; name: string }[];
    cities: { id: number; name: string }[]; // Добавляем города
}

function FilterPanel({
                         showFilters,
                         setShowFilters,
                         onFilterChange,
                         filters,
                         onResetFilters,
                         categories,
                         cities // Добавляем пропс для городов
                     }: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);
    const { t } = useTranslation('components');

    // Синхронизация с внешними фильтрами
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleRatingChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, rating: value }));
    };

    const handleReviewCountChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, reviewCount: value }));
    };

    const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, category: value }));
    };

    const handleCityChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, city: value }));
    };

    const handleApplyFilters = () => {
        onFilterChange(localFilters);
        setShowFilters(false);
    };

    const handleCancel = () => {
        const resetFilters: FilterState = {
            minPrice: '',
            maxPrice: '',
            category: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            city: '' // Сбрасываем город
        };
        setLocalFilters(resetFilters);
        onResetFilters();
        setShowFilters(false);
    };

    return (
        <>
            {showFilters && (
                <div className={styles.filters_panel}>
                    <div className={styles.filters_header}>
                        <h2>{t('filters.title')}</h2>
                    </div>

                    {/* Цена */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.price')}</h3>
                        <div className={styles.price_inputs}>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder={t('filters.priceFrom')}
                                    value={localFilters.minPrice}
                                    onChange={e => handlePriceChange('minPrice', e.target.value)}
                                />
                            </div>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder={t('filters.priceTo')}
                                    value={localFilters.maxPrice}
                                    onChange={e => handlePriceChange('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Город */}
                    {cities.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>{t('filters.city')}</h3>
                            <div className={styles.category_select}>
                                <select
                                    value={localFilters.city}
                                    onChange={e => handleCityChange(e.target.value)}
                                >
                                    <option value="">{t('filters.allCities')}</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.name.toLowerCase()}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Категория */}
                    {categories.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>{t('filters.category')}</h3>
                            <div className={styles.category_select}>
                                <select
                                    value={localFilters.category}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                >
                                    <option value="">{t('filters.allCategories')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Рейтинг */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.rating')}</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.rating}
                                onChange={e => handleRatingChange(e.target.value)}
                            >
                                <option value="">{t('filters.selectRating')}</option>
                                <option value="5">{t('filters.fiveStars')}</option>
                                <option value="4.5">{t('filters.fourHalfStars')}</option>
                                <option value="4">{t('filters.fourStars')}</option>
                                <option value="3.5">{t('filters.threeHalfStars')}</option>
                                <option value="3">{t('filters.threeStars')}</option>
                                <option value="2.5">{t('filters.twoHalfStars')}</option>
                                <option value="2">{t('filters.twoStars')}</option>
                                <option value="1.5">{t('filters.oneHalfStars')}</option>
                                <option value="1">{t('filters.oneStar')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Количество отзывов */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.reviewCount')}</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.reviewCount}
                                onChange={e => handleReviewCountChange(e.target.value)}
                            >
                                <option value="">{t('filters.selectReviewCount')}</option>
                                <option value="100">{t('filters.hundredReviews')}</option>
                                <option value="50">{t('filters.fiftyReviews')}</option>
                                <option value="20">{t('filters.twentyReviews')}</option>
                                <option value="10">{t('filters.tenReviews')}</option>
                                <option value="5">{t('filters.fiveReviews')}</option>
                                <option value="3">{t('filters.threeReviews')}</option>
                                <option value="1">{t('filters.withReviews')}</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.filter_actions}>
                        <button className={styles.cancel_btn} onClick={handleCancel}>
                            {t('filters.cancel')}
                        </button>
                        <button className={styles.apply_btn} onClick={handleApplyFilters}>
                            {t('filters.apply')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default FilterPanel;