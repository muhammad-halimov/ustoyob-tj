import styles from './FilterPanel.module.scss';
import { useState, useEffect } from 'react';

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
                        <h2>Фильтры</h2>
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

                    {/* Город */}
                    {cities.length > 0 && (
                        <div className={styles.filter_section}>
                            <h3>Город</h3>
                            <div className={styles.category_select}>
                                <select
                                    value={localFilters.city}
                                    onChange={e => handleCityChange(e.target.value)}
                                >
                                    <option value="">Все города</option>
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
                        <h3>Рейтинг исполнителя/заказчика</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.rating}
                                onChange={e => handleRatingChange(e.target.value)}
                            >
                                <option value="">Выберите рейтинг</option>
                                <option value="5">5 звезд</option>
                                <option value="4.5">4.5+ звезд</option>
                                <option value="4">4+ звезды</option>
                                <option value="3.5">3.5+ звезд</option>
                                <option value="3">3+ звезды</option>
                                <option value="2.5">2.5+ звезд</option>
                                <option value="2">2+ звезды</option>
                                <option value="1.5">1.5+ звезд</option>
                                <option value="1">1+ звезда</option>
                            </select>
                        </div>
                    </div>

                    {/* Количество отзывов */}
                    <div className={styles.filter_section}>
                        <h3>Количество отзывов о пользователе</h3>
                        <div className={styles.category_select}>
                            <select
                                value={localFilters.reviewCount}
                                onChange={e => handleReviewCountChange(e.target.value)}
                            >
                                <option value="">Выберите количество</option>
                                <option value="100">100+ отзывов</option>
                                <option value="50">50+ отзывов</option>
                                <option value="20">20+ отзывов</option>
                                <option value="10">10+ отзывов</option>
                                <option value="5">5+ отзывов</option>
                                <option value="3">3+ отзыва</option>
                                <option value="1">С отзывами</option>
                            </select>
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