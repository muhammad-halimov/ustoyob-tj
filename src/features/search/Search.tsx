import styles from './Search.module.scss';
import {useState, useEffect} from "react";
import FilterPanel from "../filters/FilterPanel.tsx";

interface SearchProps {
    onSearchResults: (results: SearchResult[]) => void;
    onFilterToggle: (isVisible: boolean) => void;
}

interface SearchResult {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    timeAgo: string;
    category: string;
}

const mockData: SearchResult[] = [
    {
        id: 1,
        title: "Ремонт ванной комнаты",
        price: 5000,
        unit: "руб/м²",
        description: "Полный ремонт ванной комнаты под ключ с заменой сантехники",
        address: "г. Москва, ул. Ленина, д. 10",
        date: "15.12.2023",
        author: "Иван Петров",
        timeAgo: "2 часа назад",
        category: "ремонт"
    },
    {
        id: 2,
        title: "Установка натяжного потолка",
        price: 1200,
        unit: "руб/м²",
        description: "Установка натяжных потолков любой сложности с гарантией",
        address: "г. Москва, пр. Мира, д. 25",
        date: "16.12.2023",
        author: "Сергей Сидоров",
        timeAgo: "1 час назад",
        category: "потолки"
    },
    {
        id: 3,
        title: "Укладка плитки в кухне",
        price: 2500,
        unit: "руб/м²",
        description: "Качественная укладка керамической плитки в кухне",
        address: "г. Москва, ул. Пушкина, д. 15",
        date: "14.12.2023",
        author: "Алексей Ковалев",
        timeAgo: "5 часов назад",
        category: "ремонт"
    },
    {
        id: 4,
        title: "Электромонтажные работы",
        price: 800,
        unit: "руб/точка",
        description: "Полный комплекс электромонтажных работ в квартире",
        address: "г. Москва, ул. Гагарина, д. 8",
        date: "13.12.2023",
        author: "Дмитрий Волков",
        timeAgo: "1 день назад",
        category: "электрика"
    },
    {
        id: 5,
        title: "Покраска стен",
        price: 400,
        unit: "руб/м²",
        description: "Качественная покраска стен с подготовкой поверхности",
        address: "г. Москва, пр. Вернадского, д. 12",
        date: "12.12.2023",
        author: "Михаил Орлов",
        timeAgo: "2 дня назад",
        category: "отделка"
    }
];

interface FilterState {
    minPrice: string;
    maxPrice: string;
}

export default function Search({ onSearchResults, onFilterToggle }: SearchProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        minPrice: '',
        maxPrice: '',
    });

    const handleResetFilters = () => {
        setFilters({
            minPrice: '',
            maxPrice: '',
        });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
    };

    const handleSearch = () => {
        if (!searchQuery.trim() && !filters.minPrice && !filters.maxPrice) {
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
            return;
        }

        const filteredResults = mockData.filter(item => {
            const matchesSearch = !searchQuery.trim() ||
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase());

            const minPrice = filters.minPrice ? parseInt(filters.minPrice) : 0;
            const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice) : Infinity;
            const matchesPrice = item.price >= minPrice && item.price <= maxPrice;

            return matchesSearch && matchesPrice;
        });

        setSearchResults(filteredResults);
        setShowResults(true);
        onSearchResults(filteredResults);
    };

    useEffect(() => {
        if (searchQuery.trim() || filters.minPrice || filters.maxPrice) {
            handleSearch();
        } else {
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
        }
    }, [filters, searchQuery]);

    const handleFilterToggle = (isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    };

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
    };

    // Автоматический поиск при изменении фильтров, если уже есть результаты
    useEffect(() => {
        if (showResults && searchQuery.trim()) {
            handleSearch();
        }
    }, [filters]);

    return (
        <div className={styles.container}>
            <div className={styles.search_with_filters}>
                <FilterPanel
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    onFilterChange={handleFilterChange}
                    filters={filters}
                    onResetFilters={handleResetFilters}
                />

                <div className={styles.search_content}>
                    <div className={styles.search}>
                        <h2 className={styles.title}>Поиск специалистов</h2>
                        <div className={styles.search_wrap}>
                            <input
                                type="text"
                                placeholder="Что хотите найти"
                                className={styles.input}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                className={styles.button}
                                onClick={handleSearch}
                            >
                                Найти
                            </button>
                        </div>
                        <button
                            className={styles.filters_btn}
                            onClick={() => handleFilterToggle(!showFilters)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_182_2269)">
                                    <g clipPath="url(#clip1_182_2269)">
                                        <path d="M7.22922 20.59L2.44922 21.59L3.44922 16.81L17.8892 2.29001C18.1398 2.03889 18.4375 1.83982 18.7653 1.70424C19.0931 1.56865 19.4445 1.49925 19.7992 1.50001C20.5153 1.50001 21.2021 1.78447 21.7084 2.29082C22.2148 2.79717 22.4992 3.48392 22.4992 4.20001C22.5 4.55474 22.4306 4.90611 22.295 5.23391C22.1594 5.56171 21.9603 5.85945 21.7092 6.11001L7.22922 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M0.550781 22.5H23.4508" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M19.6403 8.17986L15.8203 4.35986" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_182_2269">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_182_2269">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>Настроить фильтры поиска</p>
                        </button>
                    </div>

                    {/* Результаты поиска */}
                    <div className={`${styles.searchResults} ${!showResults ? styles.hidden : ''}`}>
                        {searchResults.length === 0 ? (
                            <div className={styles.noResults}>
                                <p>По вашему запросу ничего не найдено</p>
                            </div>
                        ) : (
                            searchResults.map((result) => (
                                <div key={result.id} className={styles.resultCard}>
                                    <div className={styles.resultHeader}>
                                        <h3>{result.title}</h3>
                                        <span>{result.price} {result.unit}</span>
                                    </div>
                                    <p className={styles.description}>{result.description}</p>
                                    <div className={styles.resultDetails}>
                                        <span>{result.address}</span>
                                        <span>{result.date}</span>
                                    </div>
                                    <div className={styles.resultFooter}>
                                        <span>{result.author}</span>
                                        <span className={styles.timeAgo}>{result.timeAgo}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}