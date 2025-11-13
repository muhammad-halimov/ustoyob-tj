import styles from './Search.module.scss';
import { useState, useEffect } from "react";
import FilterPanel from "../filters/FilterPanel.tsx";
import { getAuthToken } from "../../utils/auth";

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

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { title: string };
    address: { title: string; city: { title: string } };
    createdAt: string;
    master: { name: string; surname: string };
    category: { title: string };
}

interface FilterState {
    minPrice: string;
    maxPrice: string;
    category: string;
}

const API_BASE_URL = 'http://usto.tj.auto-schule.ru';

export default function Search({ onSearchResults, onFilterToggle }: SearchProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        minPrice: '',
        maxPrice: '',
        category: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const categoriesData = await response.json();
                setCategories(categoriesData);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchTickets = async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) return [];

            const params = new URLSearchParams();
            if (query.trim()) params.append('title', query);
            if (filterParams.minPrice) params.append('budget[gt]', filterParams.minPrice);
            if (filterParams.maxPrice) params.append('budget[lt]', filterParams.maxPrice);
            if (filterParams.category) params.append('category', filterParams.category);

            const response = await fetch(`${API_BASE_URL}/api/tickets/masters?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const ticketsData: ApiTicket[] = await response.json();

            return ticketsData.map(ticket => ({
                id: ticket.id,
                title: ticket.title,
                price: ticket.budget,
                unit: ticket.unit?.title || 'руб',
                description: ticket.description,
                address: `${ticket.address?.city?.title || ''}, ${ticket.address?.title || ''}`.trim(),
                date: formatDate(ticket.createdAt),
                author: ticket.master ? `${ticket.master.name} ${ticket.master.surname}` : 'Неизвестный автор',
                timeAgo: getTimeAgo(ticket.createdAt),
                category: ticket.category?.title || 'другое'
            }));
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            return new Date().toLocaleDateString('ru-RU');
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'только что';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${getRussianWord(Math.floor(diffInSeconds / 60), ['минуту', 'минуты', 'минут'])} назад`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${getRussianWord(Math.floor(diffInSeconds / 3600), ['час', 'часа', 'часов'])} назад`;
            return `${Math.floor(diffInSeconds / 86400)} ${getRussianWord(Math.floor(diffInSeconds / 86400), ['день', 'дня', 'дней'])} назад`;
        } catch {
            return 'недавно';
        }
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
    };

    const handleResetFilters = () => {
        setFilters({ minPrice: '', maxPrice: '', category: '' });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() && !filters.minPrice && !filters.maxPrice && !filters.category) {
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
            return;
        }

        const results = await fetchTickets(searchQuery, filters);
        setSearchResults(results);
        setShowResults(true);
        onSearchResults(results);
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchQuery.trim() || filters.minPrice || filters.maxPrice || filters.category) {
                handleSearch();
            } else {
                setShowResults(false);
                setSearchResults([]);
                onSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [searchQuery, filters]);

    const handleFilterToggle = (isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    };

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
    };

    return (
        <div className={styles.container}>
            <div className={styles.search_with_filters}>
                <FilterPanel
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    onFilterChange={handleFilterChange}
                    filters={filters}
                    onResetFilters={handleResetFilters}
                    categories={categories}
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
                            <button className={styles.button} onClick={handleSearch} disabled={isLoading}>
                                {isLoading ? 'Поиск...' : 'Найти'}
                            </button>
                        </div>
                        <button className={styles.filters_btn} onClick={() => handleFilterToggle(!showFilters)}>
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

                    <div className={`${styles.searchResults} ${!showResults ? styles.hidden : ''}`}>
                        {isLoading ? (
                            <div className={styles.loading}><p>Загрузка...</p></div>
                        ) : searchResults.length === 0 ? (
                            <div className={styles.noResults}><p>По вашему запросу ничего не найдено</p></div>
                        ) : (
                            searchResults.map((result) => (
                                <div key={result.id} className={styles.resultCard}>
                                    <div className={styles.resultHeader}>
                                        <h3>{result.title}</h3>
                                        <span className={styles.price}>{result.price} руб {result.unit}</span>
                                    </div>
                                    <p className={styles.description}>{result.description}</p>
                                    <div className={styles.resultDetails}>
                                        <span className={styles.address}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                                            </svg>
                                        {result.address}
                                        </span>
                                        <span className={styles.date}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            {result.date}
                                        </span>
                                    </div>
                                    <div className={styles.resultFooter}>
                                        <span className={styles.author}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="7" r="4" stroke="#3A54DA" strokeWidth="2"/>
                                                <path d="M6 21v-2a6 6 0 0112 0v2" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            {result.author}
                                        </span>
                                        <span className={styles.timeAgo}>{result.timeAgo}</span>
        {/*                                <span className={styles.category}>*/}
        {/*    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
        {/*        <path d="M3 6h18M3 12h18M3 18h18" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>*/}
        {/*    </svg>*/}
        {/*                                    {result.category}*/}
        {/*</span>*/}
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
