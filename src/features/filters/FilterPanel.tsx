import styles from './FilterPanel.module.scss'
import {useState, useEffect} from "react";

interface FilterPanelProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onFilterChange: (filters: FilterState) => void;
    filters: FilterState;
    onResetFilters: () => void;
}

interface FilterState {
    minPrice: string;
    maxPrice: string;
}

function FilterPanel({ showFilters, setShowFilters, onFilterChange, filters, onResetFilters }: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
        const newFilters = {
            ...localFilters,
            [field]: value
        };
        setLocalFilters(newFilters);
    };

    const handleApplyFilters = () => {
        onFilterChange(localFilters);
        setShowFilters(true);
    };

    const handleCancel = () => {
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

                    <div className={styles.filter_section}>
                        <h3>Цена</h3>
                        <div className={styles.price_inputs}>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder="От"
                                    value={localFilters.minPrice}
                                    onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                                />
                            </div>
                            <div className={styles.price_input}>
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={localFilters.maxPrice}
                                    onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.filter_section}>
                        <h3>Характеристика</h3>
                        <div className={styles.characteristic_list}>
                            <div className={styles.characteristic_item}>
                                <svg className={styles.circle_icon} width="24" height="24" viewBox="0 0 24 24"
                                     fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_182_2657)">
                                        <g clipPath="url(#clip1_182_2657)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                                  stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M11.9998 16.7698V10.0898H10.0898"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M10.0898 16.77H13.9098"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M11.0498 7.22998H12.9498"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_182_2657">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_182_2657">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>

                                <div className={styles.characteristic_title}>
                                    <h3>Характеристика</h3>
                                    <span>пояснение</span>
                                </div>
                            </div>
                            <div className={styles.characteristic_item}>
                                <svg className={styles.circle_icon} width="24" height="24" viewBox="0 0 24 24"
                                     fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_182_2657)">
                                        <g clipPath="url(#clip1_182_2657)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                                  stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M11.9998 16.7698V10.0898H10.0898"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M10.0898 16.77H13.9098"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M11.0498 7.22998H12.9498"
                                                  stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_182_2657">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_182_2657">
                                            <rect width="24" height="24" fill="white"/>
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