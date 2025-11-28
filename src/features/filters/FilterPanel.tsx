import styles from './FilterPanel.module.scss';
import { useState, useEffect } from 'react';

export interface FilterState {
    minPrice: string;
    maxPrice: string;
    category: string;
    rating: string;
    reviewCount: string;
    sortBy: string;
}

interface FilterPanelProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onFilterChange: (filters: FilterState) => void;
    filters: FilterState;
    onResetFilters: () => void;
    categories: { id: number; name: string }[];
}

function FilterPanel({
                         showFilters,
                         setShowFilters,
                         onFilterChange,
                         filters,
                         onResetFilters,
                         categories
                     }: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);

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

    const handleSortChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, sortBy: value }));
    };

    const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (value: string) => {
        setLocalFilters(prev => ({ ...prev, category: value }));
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
            sortBy: ''
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
                        <h2>Фильтры</h2>
                    </div>

                    {/* Сортировка */}
                    <div className={styles.filter_section}>
                        <h3>Сортировка</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.sortBy}
                                onChange={e => handleSortChange(e.target.value)}
                            >
                                <option value="">По умолчанию</option>
                                <option value="rating_desc">По рейтингу (убыв.)</option>
                                <option value="rating_asc">По рейтингу (возр.)</option>
                                <option value="reviews_desc">По отзывам (убыв.)</option>
                                <option value="reviews_asc">По отзывам (возр.)</option>
                                <option value="price_desc">По цене (убыв.)</option>
                                <option value="price_asc">По цене (возр.)</option>
                                <option value="date_desc">По дате (новые)</option>
                                <option value="date_asc">По дате (старые)</option>
                            </select>
                        </div>
                    </div>

                    {/* Цена */}
                    <div className={styles.filter_section}>
                        <h3>Цена</h3>
                        <div className={styles.price_inputs}>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder="От"
                                    value={localFilters.minPrice}
                                    onChange={e => handlePriceChange('minPrice', e.target.value)}
                                />
                            </div>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={localFilters.maxPrice}
                                    onChange={e => handlePriceChange('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Категория */}
                    {categories.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>Категория</h3>
                            <div className={styles.category_select}>
                                <select
                                    value={localFilters.category}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                >
                                    <option value="">Все категории</option>
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
                        <h3>Рейтинг</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.rating}
                                onChange={e => handleRatingChange(e.target.value)}
                            >
                                <option value="">Любой рейтинг</option>
                                <option value="5">5 звезд</option>
                                <option value="4">4+ звезды</option>
                                <option value="3">3+ звезды</option>
                                <option value="2">2+ звезды</option>
                                <option value="1">1+ звезда</option>
                            </select>
                        </div>
                    </div>

                    {/* Количество отзывов */}
                    <div className={styles.filter_section}>
                        <h3>Количество отзывов</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.reviewCount}
                                onChange={e => handleReviewCountChange(e.target.value)}
                            >
                                <option value="">Любое количество</option>
                                <option value="100">100+ отзывов</option>
                                <option value="50">50+ отзывов</option>
                                <option value="20">20+ отзывов</option>
                                <option value="10">10+ отзывов</option>
                                <option value="5">5+ отзывов</option>
                                <option value="1">С отзывами</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.filter_section}>
                        <h3>Характеристика</h3>
                        <div className={styles.characteristic_list}>
                            <div className={styles.characteristic_item}>
                                <svg className={styles.circle_icon} width="24" height="24" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_182_2657)">
                                        <g clipPath="url(#clip1_182_2657)">
                                            <path
                                                d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                                stroke="black" strokeWidth="2" strokeMiterlimit="10" />
                                            <path d="M11.9998 16.7698V10.0898H10.0898" stroke="currentColor" strokeWidth="2"
                                                  strokeMiterlimit="10" />
                                            <path d="M10.0898 16.77H13.9098" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" />
                                            <path d="M11.0498 7.22998H12.9498" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" />
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_182_2657">
                                            <rect width="24" height="24" fill="white" />
                                        </clipPath>
                                        <clipPath id="clip1_182_2657">
                                            <rect width="24" height="24" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>

                                <div className={styles.characteristic_title}>
                                    <h3>Характеристика</h3>
                                    <span>пояснение</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.filter_actions}>
                        <button className={styles.cancel_btn} onClick={handleCancel}>
                            Отменить
                        </button>
                        <button className={styles.apply_btn} onClick={handleApplyFilters}>
                            Применить
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default FilterPanel;