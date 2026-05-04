import styles from './FilterPanel.module.scss';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectSearch, SelectOption } from '../../../../shared/ui/SelectSearch';
import PageLoader from '../../../../widgets/PageLoader/PageLoader';

interface Occupation {
    id: number;
    title: string;
    categories: { id: number; title: string }[];
}

export interface FilterState {
    minPrice: string;
    maxPrice: string;
    category: string;
    subcategory: string; // Добавляем подкатегорию
    rating: string;
    reviewCount: string;
    sortBy: string;
    city: string; // Добавляем город
}

interface FilterPanelProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onApply: (filters: FilterState) => Promise<void> | void;
    filters: FilterState;
    onResetFilters: () => void;
    categories: { id: number; name: string }[];
    cities: { id: number; name: string }[];
    occupations: Occupation[];
}

function FilterPanel({
                         showFilters,
                         onApply,
                         filters,
                         onResetFilters,
                         categories,
                         cities,
                         occupations
                     }: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);
    const [isApplying, setIsApplying] = useState(false);
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
        setLocalFilters(prev => ({ 
            ...prev, 
            category: value,
            subcategory: '' // Сбрасываем подкатегорию при смене категории
        }));
    };

    const handleSubcategoryChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, subcategory: value }));
    };

    // Функция для получения подкатегорий для выбранной категории
    const getFilteredOccupations = () => {
        if (!localFilters.category) return [];
        return occupations.filter(occupation => 
            occupation.categories.some(cat => cat.id.toString() === localFilters.category)
        );
    };

    const handleCityChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, city: value }));
    };

    const cityOptions = useMemo<SelectOption[]>(
        () => cities.map(c => ({ value: c.name.toLowerCase(), label: c.name })),
        [cities],
    );

    const categoryOptions = useMemo<SelectOption[]>(
        () => categories.map(c => ({ value: c.id.toString(), label: c.name })),
        [categories],
    );

    const subcategoryOptions = useMemo<SelectOption[]>(
        () => getFilteredOccupations().map(o => ({ value: o.id.toString(), label: o.title })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [localFilters.category, occupations],
    );

    const ratingOptions = useMemo<SelectOption[]>(() => [
        { value: '5',   label: t('filters.fiveStars') },
        { value: '4.5', label: t('filters.fourHalfStars') },
        { value: '4',   label: t('filters.fourStars') },
        { value: '3.5', label: t('filters.threeHalfStars') },
        { value: '3',   label: t('filters.threeStars') },
        { value: '2.5', label: t('filters.twoHalfStars') },
        { value: '2',   label: t('filters.twoStars') },
        { value: '1.5', label: t('filters.oneHalfStars') },
        { value: '1',   label: t('filters.oneStar') },
    ], [t]);

    const reviewCountOptions = useMemo<SelectOption[]>(() => [
        { value: '100', label: t('filters.hundredReviews') },
        { value: '50',  label: t('filters.fiftyReviews') },
        { value: '20',  label: t('filters.twentyReviews') },
        { value: '10',  label: t('filters.tenReviews') },
        { value: '5',   label: t('filters.fiveReviews') },
        { value: '3',   label: t('filters.threeReviews') },
        { value: '1',   label: t('filters.withReviews') },
    ], [t]);

    const handleApplyFilters = async () => {
        setIsApplying(true);
        try {
            await onApply(localFilters);
        } finally {
            setIsApplying(false);
        }
    };

    const handleCancel = () => {
        const resetFilters: FilterState = {
            minPrice: '',
            maxPrice: '',
            category: '',
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            city: '',
        };
        setLocalFilters(resetFilters);
        onResetFilters();
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
                            <SelectSearch
                                options={cityOptions}
                                value={localFilters.city}
                                onChange={handleCityChange}
                                placeholder={t('filters.allCities')}
                                searchPlaceholder={t('filters.searchCity')}
                            />
                        </div>
                    )}

                    {/* Категория */}
                    {categories.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>{t('filters.category')}</h3>
                            <SelectSearch
                                options={categoryOptions}
                                value={localFilters.category}
                                onChange={handleCategoryChange}
                                placeholder={t('filters.allCategories')}
                                searchPlaceholder={t('filters.searchCategory')}
                            />
                        </div>
                    )}

                    {/* Подкатегория */}
                    {localFilters.category && subcategoryOptions.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>{t('filters.subcategory')}</h3>
                            <SelectSearch
                                options={subcategoryOptions}
                                value={localFilters.subcategory}
                                onChange={handleSubcategoryChange}
                                placeholder={t('filters.allSubcategories')}
                                searchPlaceholder={t('filters.searchSubcategory')}
                            />
                        </div>
                    )}

                    {/* Рейтинг */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.rating')}</h3>
                        <SelectSearch
                            options={ratingOptions}
                            value={localFilters.rating}
                            onChange={handleRatingChange}
                            placeholder={t('filters.selectRating')}
                        />
                    </div>

                    {/* Количество отзывов */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.reviewCount')}</h3>
                        <SelectSearch
                            options={reviewCountOptions}
                            value={localFilters.reviewCount}
                            onChange={handleReviewCountChange}
                            placeholder={t('filters.selectReviewCount')}
                        />
                    </div>

                    <div className={styles.filter_actions}>
                        <button className={styles.cancel_btn} onClick={handleCancel}>
                            {t('filters.cancel')}
                        </button>
                        <button className={styles.apply_btn} onClick={handleApplyFilters} disabled={isApplying}>
                            {isApplying
                                ? <PageLoader fullPage={false} compact primary asSpan />
                                : t('filters.apply')
                            }
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default FilterPanel;