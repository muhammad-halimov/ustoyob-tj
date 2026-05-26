import styles from './FilterPanel.module.scss';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectSearch, SelectOption } from '../../../../shared/ui/SelectSearch';
import PageLoader from '../../../../widgets/PageLoader/PageLoader';
import { Toggle } from '../../../../shared/ui/Button/Toggle/Toggle';
import type { Occupation, Category, FilterState } from '../../../../entities';
import type { Province } from '../../../../entities';
import { getCities, getDistricts } from '../../../../utils/dataCache';

interface FilterPanelProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onApply: (filters: FilterState) => Promise<void> | void;
    filters: FilterState;
    onResetFilters: () => void;
    categories: Category[];
    provinces: Province[];
    cities: { id: number; title: string }[];
    occupations: Occupation[];
}

function FilterPanel({
                         showFilters,
                         onApply,
                         filters,
                         onResetFilters,
                         categories = [],
                         provinces = [],
                         cities: _cities = [],
                         occupations = []
                     }: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);
    const [isApplying, setIsApplying] = useState(false);
    const [cityDistrictOptions, setCityDistrictOptions] = useState<SelectOption[]>([]);
    const [isCityDistrictLoading, setIsCityDistrictLoading] = useState(false);
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

    const handleNegotiablePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFilters(prev => ({ ...prev, negotiablePrice: e.target.checked }));
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
            occupation.categories?.some(cat => cat.id.toString() === localFilters.category)
        );
    };

    const handleProvinceChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, province: value }));
    };

    const handleCityChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, city: value }));
    };

    useEffect(() => {
        const fetchCityDistricts = async () => {
            setIsCityDistrictLoading(true);
            try {
                const [allCities, allDistricts] = await Promise.all([getCities(), getDistricts()]);

                const provinceId = localFilters.province ? Number(localFilters.province) : null;
                const citiesFiltered = provinceId
                    ? allCities.filter(c => c.province?.id === provinceId)
                    : allCities;
                const districtsFiltered = provinceId
                    ? allDistricts.filter(d => d.province?.id === provinceId)
                    : allDistricts;

                const combined: SelectOption[] = [
                    ...citiesFiltered.map((c: { id: number; title: string }) => ({ value: `city_${c.id}`, label: c.title })),
                    ...districtsFiltered.map((d: { id: number; title?: string }) => ({ value: `district_${d.id}`, label: d.title ?? '' })),
                ].sort((a, b) => a.label.localeCompare(b.label));

                setCityDistrictOptions(combined);

                // Если выбранный город/район не входит в новый список — сбрасываем
                if (localFilters.city && !combined.some(o => o.value === localFilters.city)) {
                    setLocalFilters(prev => ({ ...prev, city: '' }));
                }
            } catch (err) {
                console.error('Error fetching cities/districts:', err);
                setCityDistrictOptions([]);
            } finally {
                setIsCityDistrictLoading(false);
            }
        };

        fetchCityDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localFilters.province]);

    const provinceOptions = useMemo<SelectOption[]>(
        () => provinces.map(p => ({ value: p.id.toString(), label: p.title ?? '' })),
        [provinces],
    );

    const categoryOptions = useMemo<SelectOption[]>(
        () => categories.map(c => ({ value: c.id.toString(), label: c.title })),
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
            negotiablePrice: false,
            category: '',
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            province: '',
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
                                    disabled={localFilters.negotiablePrice}
                                />
                            </div>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder={t('filters.priceTo')}
                                    value={localFilters.maxPrice}
                                    onChange={e => handlePriceChange('maxPrice', e.target.value)}
                                    disabled={localFilters.negotiablePrice}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Провинция */}
                    {provinces.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>{t('filters.province')}</h3>
                            <SelectSearch
                                options={provinceOptions}
                                value={localFilters.province}
                                onChange={handleProvinceChange}
                                placeholder={t('filters.allProvinces')}
                                searchPlaceholder={t('filters.searchProvince')}
                            />
                        </div>
                    )}

                    {/* Город/Район */}
                    <div className={styles.filter_section}>
                        <h3>{t('filters.cityDistrict')}</h3>
                        {isCityDistrictLoading ? (
                            <PageLoader fullPage={false} compact asSpan />
                        ) : (
                            <SelectSearch
                                options={cityDistrictOptions}
                                value={localFilters.city}
                                onChange={handleCityChange}
                                placeholder={t('filters.allCities')}
                                searchPlaceholder={t('filters.searchCity')}
                            />
                        )}
                    </div>

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

                    {/* Договорная цена */}
                    <div className={styles.filter_section}>
                        <Toggle
                            checked={localFilters.negotiablePrice}
                            onChange={handleNegotiablePriceChange}
                            label={t('filters.negotiablePrice')}
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