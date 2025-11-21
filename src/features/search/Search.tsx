import styles from './Search.module.scss';
import {useState, useEffect, useCallback, useMemo, useRef} from "react";
import FilterPanel from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import {useNavigate} from "react-router-dom";

// Интерфейсы остаются без изменений
interface User {
    id: number;
    email: string;
    name: string;
    surname: string;
    patronymic: string;
    bio: string;
    rating: number;
    gender: string;
    image: string;
    phone1: string;
    phone2: string;
    remotely: boolean;
    roles: string[];
}

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { title: string };
    address: { title: string; city: { title: string } };
    district?: {
        id: number;
        title?: string;
        city?: {
            id: number;
            title?: string;
        };
    };
    createdAt: string;
    master: { id: number } | null;
    author: { id: number } | null;
    category: {
        id: number;
        title: string
    };
}

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
    authorId?: number;
    timeAgo: string;
    category: string;
    type: 'client' | 'master';
}

interface FilterState {
    minPrice: string;
    maxPrice: string;
    category: string;
}

const API_BASE_URL = 'https://admin.ustoyob.tj';

// Кэши вне компонента для глобального доступа
const usersCache = new Map<number, User>();
const categoriesCache = new Map<number, { id: number, name: string }>();

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
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const navigate = useNavigate();

    const previousSearchRef = useRef<{
        query: string;
        filters: FilterState;
        userRole: 'client' | 'master' | null;
    }>({
        query: '',
        filters: { minPrice: '', maxPrice: '', category: '' },
        userRole: null
    });

    // Флаг для предотвращения дублирующих запросов
    const isSearchInProgressRef = useRef(false);

    // Мемоизированные функции
    const getFormattedAddress = useCallback((ticket: ApiTicket): string => {
        const districtTitle = ticket.district?.title || '';
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';

        const city = districtCity || addressCity;
        const district = districtTitle;

        if (district && city && addressTitle) {
            return `${district}, ${city}, ${addressTitle}`;
        }
        if (district && city) {
            return `${district}, ${city}`;
        }
        if (city && addressTitle) {
            return `${city}, ${addressTitle}`;
        }
        if (city) {
            return city;
        }
        if (district) {
            return district;
        }
        if (addressTitle) {
            return addressTitle;
        }
        return 'Адрес не указан';
    }, []);

    const getTimeAgo = useCallback((dateString: string): string => {
        if (!dateString) return 'давно';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) {
            return `${diffMins} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else {
            return `${diffDays} дн назад`;
        }
    }, []);

    const getTicketTypeLabel = useCallback((type: 'client' | 'master') => {
        return type === 'client' ? 'Заказ от клиента' : 'Услуга от мастера';
    }, []);

    const getSearchTitle = useMemo(() => {
        if (userRole === 'client') {
            return 'Поиск специалистов';
        } else if (userRole === 'master') {
            return 'Поиск заказов';
        } else {
            return 'Поиск услуг и заказов';
        }
    }, [userRole]);

    const getSearchPlaceholder = useMemo(() => {
        if (userRole === 'client') {
            return "Что хотите найти";
        } else if (userRole === 'master') {
            return "Какую услугу ищете";
        } else {
            return "Что ищете";
        }
    }, [userRole]);

    // Оптимизированная функция получения пользователя
    const fetchUser = useCallback(async (userId: number, userType: 'client' | 'master'): Promise<User | null> => {
        // Проверяем кэш
        if (usersCache.has(userId)) {
            return usersCache.get(userId) || null;
        }

        const token = getAuthToken();
        if (!token) return null;

        const endpoint = userType === 'master' ? '/api/users/masters' : '/api/users/clients';

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) return null;

            const usersData: User[] = await response.json();
            const userData = usersData.find(user => user.id === userId) || null;

            if (userData) {
                usersCache.set(userId, userData);
            }

            return userData;
        } catch (error) {
            console.error(`Error fetching ${userType} user ${userId}:`, error);
            return null;
        }
    }, []);

    // Оптимизированная функция получения имени пользователя
    const getUserName = useCallback(async (ticket: ApiTicket, ticketType: 'client' | 'master'): Promise<string> => {
        const userId = ticketType === 'client' ? ticket.author?.id : ticket.master?.id;

        if (!userId) {
            return ticketType === 'client' ? 'Клиент не указан' : 'Мастер не назначен';
        }

        const user = await fetchUser(userId, ticketType);

        if (user?.name && user?.surname) {
            return `${user.name} ${user.surname}`.trim();
        } else if (user?.name) {
            return user.name;
        } else if (user?.surname) {
            return user.surname;
        }

        return 'Пользователь не найден';
    }, [fetchUser]);

    // Оптимизированная функция загрузки категорий
    const fetchCategories = useCallback(async () => {
        // Если категории уже загружены, не загружаем снова
        if (categoriesCache.size > 0) {
            setCategories(Array.from(categoriesCache.values()));
            return;
        }

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
                const formatted = categoriesData.map((cat: any) => ({
                    id: cat.id,
                    name: cat.title
                }));

                // Сохраняем в кэш
                formatted.forEach((cat: { id: number, name: string }) => {
                    categoriesCache.set(cat.id, cat);
                });

                setCategories(formatted);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // Оптимизированная функция загрузки всех тикетов
    const fetchAllTickets = useCallback(async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const params = new URLSearchParams();
            if (query.trim()) params.append('title', query.trim());
            if (filterParams.minPrice) params.append('minBudget', filterParams.minPrice);
            if (filterParams.maxPrice) params.append('maxBudget', filterParams.maxPrice);
            if (filterParams.category) params.append('category.id', filterParams.category);

            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const [clientResponse, masterResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tickets/clients?${params.toString()}`, { method: 'GET', headers }),
                fetch(`${API_BASE_URL}/api/tickets/masters?${params.toString()}`, { method: 'GET', headers })
            ]);

            let clientTickets: ApiTicket[] = [];
            let masterTickets: ApiTicket[] = [];

            if (clientResponse.ok) {
                clientTickets = await clientResponse.json();
            }

            if (masterResponse.ok) {
                masterTickets = await masterResponse.json();
            }

            const allTickets = [
                ...clientTickets.map(ticket => ({ ...ticket, type: 'client' as const })),
                ...masterTickets.map(ticket => ({ ...ticket, type: 'master' as const }))
            ];

            let filteredData = allTickets.filter(ticket => {
                if (query.trim()) {
                    const searchTerm = query.trim().toLowerCase();
                    const matchesSearch =
                        ticket.title.toLowerCase().includes(searchTerm) ||
                        ticket.description.toLowerCase().includes(searchTerm) ||
                        (ticket.category?.title && ticket.category.title.toLowerCase().includes(searchTerm));
                    if (!matchesSearch) return false;
                }

                if (filterParams.minPrice) {
                    const minPrice = parseInt(filterParams.minPrice);
                    if (ticket.budget < minPrice) return false;
                }

                if (filterParams.maxPrice) {
                    const maxPrice = parseInt(filterParams.maxPrice);
                    if (ticket.budget > maxPrice) return false;
                }

                if (filterParams.category && ticket.category?.id.toString() !== filterParams.category) {
                    return false;
                }

                return true;
            });

            // Явно указываем тип SearchResult
            const ticketsWithUsers: SearchResult[] = filteredData.map((ticket) => {
                const authorId = ticket.author?.id || ticket.master?.id || undefined;
                const userName = ticket.author?.id ? 'Клиент' : ticket.master?.id ? 'Мастер' : 'Пользователь не указан';

                const formattedDate = ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleDateString('ru-RU')
                    : 'Дата не указана';

                return {
                    id: ticket.id,
                    title: ticket.title,
                    price: ticket.budget,
                    unit: ticket.unit?.title || 'руб',
                    description: ticket.description,
                    address: getFormattedAddress(ticket),
                    date: formattedDate,
                    author: userName,
                    authorId,
                    timeAgo: getTimeAgo(ticket.createdAt),
                    category: ticket.category?.title || 'другое',
                    type: ticket.type // type уже правильно типизирован как 'client' | 'master'
                };
            });

            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [getFormattedAddress, getTimeAgo]);

    // Оптимизированная функция загрузки тикетов по роли
    const fetchTicketsByRole = useCallback(async (query: string = '', filterParams: FilterState) => {
        if (userRole === null) {
            return await fetchAllTickets(query, filterParams);
        }

        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) return [];

            const params = new URLSearchParams();
            if (query.trim()) params.append('title', query.trim());
            if (filterParams.minPrice) params.append('minBudget', filterParams.minPrice);
            if (filterParams.maxPrice) params.append('maxBudget', filterParams.maxPrice);
            if (filterParams.category) params.append('category.id', filterParams.category);

            const endpoint = userRole === 'client' ? '/api/tickets/masters' : '/api/tickets/clients';
            const ticketType = userRole === 'client' ? 'master' as const : 'client' as const; // Явно указываем тип

            const response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const ticketsData: ApiTicket[] = await response.json();

            const filteredData = ticketsData.filter(ticket => {
                if (query.trim()) {
                    const searchTerm = query.trim().toLowerCase();
                    const matchesSearch =
                        ticket.title.toLowerCase().includes(searchTerm) ||
                        ticket.description.toLowerCase().includes(searchTerm) ||
                        (ticket.category?.title && ticket.category.title.toLowerCase().includes(searchTerm));
                    if (!matchesSearch) return false;
                }

                if (filterParams.minPrice) {
                    const minPrice = parseInt(filterParams.minPrice);
                    if (ticket.budget < minPrice) return false;
                }

                if (filterParams.maxPrice) {
                    const maxPrice = parseInt(filterParams.maxPrice);
                    if (ticket.budget > maxPrice) return false;
                }

                if (filterParams.category && ticket.category?.id.toString() !== filterParams.category) {
                    return false;
                }

                return true;
            });

            // Явно указываем тип SearchResult
            const ticketsWithUsers: SearchResult[] = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticketType);
                    const authorId = ticketType === 'client' ? ticket.author?.id : ticket.master?.id;

                    const formattedDate = ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString('ru-RU')
                        : 'Дата не указана';

                    return {
                        id: ticket.id,
                        title: ticket.title,
                        price: ticket.budget,
                        unit: ticket.unit?.title || 'руб',
                        description: ticket.description,
                        address: getFormattedAddress(ticket),
                        date: formattedDate,
                        author: userName,
                        authorId,
                        timeAgo: getTimeAgo(ticket.createdAt),
                        category: ticket.category?.title || 'другое',
                        type: ticketType // Используем явно типизированную переменную
                    };
                })
            );

            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [userRole, fetchAllTickets, getUserName, getFormattedAddress, getTimeAgo]);

    // Оптимизированный обработчик поиска
    const handleSearch = useCallback(async () => {
        // Проверяем, не выполняется ли уже поиск
        if (isSearchInProgressRef.current) {
            console.log('Search already in progress, skipping...');
            return;
        }

        // Проверяем, изменились ли параметры поиска
        const currentSearch = { query: searchQuery.trim(), filters, userRole };
        const previousSearch = previousSearchRef.current;

        const hasQueryChanged = currentSearch.query !== previousSearch.query;
        const hasFiltersChanged =
            currentSearch.filters.minPrice !== previousSearch.filters.minPrice ||
            currentSearch.filters.maxPrice !== previousSearch.filters.maxPrice ||
            currentSearch.filters.category !== previousSearch.filters.category;
        const hasRoleChanged = currentSearch.userRole !== previousSearch.userRole;

        // Если ничего не изменилось, не выполняем поиск
        if (!hasQueryChanged && !hasFiltersChanged && !hasRoleChanged) {
            console.log('Search parameters unchanged, skipping...');
            return;
        }

        // Если нет поискового запроса и фильтров - очищаем результаты
        if (!currentSearch.query && !filters.minPrice && !filters.maxPrice && !filters.category) {
            console.log('Clearing results - no search criteria');
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
            previousSearchRef.current = currentSearch;
            return;
        }

        try {
            isSearchInProgressRef.current = true;
            console.log('Starting search with:', currentSearch);

            const results = await fetchTicketsByRole(searchQuery, filters);
            console.log('Search completed. Results:', results.length);

            setSearchResults(results);
            setShowResults(true);
            onSearchResults(results);

            // Обновляем предыдущий поиск
            previousSearchRef.current = currentSearch;
        } catch (error) {
            console.error('Error in handleSearch:', error);
            setSearchResults([]);
            setShowResults(false);
            onSearchResults([]);
        } finally {
            isSearchInProgressRef.current = false;
        }
    }, [searchQuery, filters, userRole, fetchTicketsByRole, onSearchResults]);

    // Обработчики событий
    const handleCardClick = useCallback((ticketId?: number, authorId?: number) => {
        if (!ticketId) return;
        const targetAuthorId = authorId || ticketId;
        navigate(`/order/${targetAuthorId}?ticket=${ticketId}`);
    }, [navigate]);

    const handleFilterToggle = useCallback((isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    }, [onFilterToggle]);

    const handleResetFilters = useCallback(() => {
        setFilters({ minPrice: '', maxPrice: '', category: '' });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
        // Сбрасываем предыдущий поиск
        previousSearchRef.current = {
            query: searchQuery,
            filters: { minPrice: '', maxPrice: '', category: '' },
            userRole
        };
    }, [searchQuery, userRole, onSearchResults]);

    // Эффекты
    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            handleSearch();
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, filters.minPrice, filters.maxPrice, filters.category, userRole, handleSearch]);

    // useEffect(() => {
    //     const debounce = setTimeout(() => {
    //         if (searchQuery.trim() || filters.minPrice || filters.maxPrice || filters.category) {
    //             handleSearch();
    //         } else {
    //             setShowResults(false);
    //             setSearchResults([]);
    //             onSearchResults([]);
    //         }
    //     }, 500);
    //
    //     return () => clearTimeout(debounce);
    // }, [searchQuery, filters, handleSearch, onSearchResults]);

    const handleFilterChange = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);
    }, []);

    // Мемоизированный рендер результатов
    const renderedResults = useMemo(() => {
        if (isLoading) {
            return <div className={styles.loading}><p>Загрузка...</p></div>;
        }

        if (searchResults.length === 0) {
            return <div className={styles.noResults}><p>По вашему запросу ничего не найдено</p></div>;
        }

        return searchResults.map((result) => (
            <div key={result.id}
                 className={styles.resultCard}
                 onClick={() => handleCardClick(result.id, result.authorId)}
                 style={{ cursor: 'pointer' }}
            >
                {userRole === null && (
                    <div className={styles.ticketType}>
                        {getTicketTypeLabel(result.type)}
                    </div>
                )}
                <div className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <span className={styles.price}>{result.price} {result.unit}</span>
                </div>
                <p className={styles.description}>{result.description}</p>
                <div className={styles.resultDetails}>
                    <span className={styles.category}>
                        {result.category}
                    </span>
                    <span className={styles.address}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        {result.address}
                    </span>
                    <span className={styles.date}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {result.date}
                    </span>
                </div>
                <div className={styles.resultFooter}>
                    <span className={styles.author}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_324_2870)">
                            <g clipPath="url(#clip1_324_2870)">
                            <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                            <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                            </g>
                            </g>
                            <defs>
                            <clipPath id="clip0_324_2870">
                            <rect width="24" height="24" fill="white"/>
                            </clipPath>
                            <clipPath id="clip1_324_2870">
                            <rect width="24" height="24" fill="white"/>
                            </clipPath>
                            </defs>
                        </svg>
                        {result.author}
                    </span>
                    <span className={styles.timeAgo}>{result.timeAgo}</span>
                </div>
            </div>
        ));
    }, [isLoading, searchResults, userRole, getTicketTypeLabel, handleCardClick]);

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
                        <h2 className={styles.title}>
                            {getSearchTitle}
                        </h2>
                        <div className={styles.search_wrap}>
                            <input
                                type="text"
                                placeholder={getSearchPlaceholder}
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
                                    </g>
                                </g>
                            </svg>
                            <p>Настроить фильтры поиска</p>
                        </button>
                    </div>

                    <div className={`${styles.searchResults} ${!showResults ? styles.hidden : ''}`}>
                        {renderedResults}
                    </div>
                </div>
            </div>
        </div>
    );
}