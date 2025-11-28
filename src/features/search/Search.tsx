import styles from './Search.module.scss';
import {useState, useEffect, useCallback, useMemo, useRef} from "react";
import FilterPanel, { FilterState } from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import {useNavigate} from "react-router-dom";

// Интерфейсы
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

// Тип для тикета с добавленным полем type
interface TypedTicket extends ApiTicket {
    type: 'client' | 'master';
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
        category: '',
        rating: '',
        reviewCount: '',
        sortBy: ''
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
        filters: {
            minPrice: '',
            maxPrice: '',
            category: '',
            rating: '',
            reviewCount: '',
            sortBy: ''
        },
        userRole: null
    });

    // Флаг для предотвращения дублирующих запросов
    const isSearchInProgressRef = useRef(false);

    // Функция сортировки тикетов
    const sortTickets = useCallback((tickets: TypedTicket[], sortBy: string): TypedTicket[] => {
        const sortedTickets = [...tickets];

        switch (sortBy) {
            case 'rating_desc':
                // Сортировка по рейтингу (если бы было поле rating)
                return sortedTickets.sort((a, b) => (b.budget || 0) - (a.budget || 0));
            case 'rating_asc':
                return sortedTickets.sort((a, b) => (a.budget || 0) - (b.budget || 0));
            case 'reviews_desc':
                // Сортировка по отзывам (если бы было поле reviewCount)
                return sortedTickets.sort((a, b) => (b.budget || 0) - (a.budget || 0));
            case 'reviews_asc':
                return sortedTickets.sort((a, b) => (a.budget || 0) - (b.budget || 0));
            case 'price_desc':
                return sortedTickets.sort((a, b) => b.budget - a.budget);
            case 'price_asc':
                return sortedTickets.sort((a, b) => a.budget - b.budget);
            case 'date_desc':
                return sortedTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            case 'date_asc':
                return sortedTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            default:
                return sortedTickets;
        }
    }, []);

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
            return 'Поиск услуг';
        } else if (userRole === 'master') {
            return 'Поиск объявлений';
        } else {
            return 'Поиск услуг и объявлений';
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

            // Создаем типизированные тикеты с явным указанием типа
            const allTickets: TypedTicket[] = [
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

            // Применяем сортировку
            if (filterParams.sortBy) {
                filteredData = sortTickets(filteredData, filterParams.sortBy);
            }

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
                    unit: ticket.unit?.title || 'TJS',
                    description: ticket.description,
                    address: getFormattedAddress(ticket),
                    date: formattedDate,
                    author: userName,
                    authorId,
                    timeAgo: getTimeAgo(ticket.createdAt),
                    category: ticket.category?.title || 'другое',
                    type: ticket.type
                };
            });

            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [getFormattedAddress, getTimeAgo, sortTickets]);

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
            const ticketType = userRole === 'client' ? 'master' as const : 'client' as const;

            const response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const ticketsData: ApiTicket[] = await response.json();

            // Создаем типизированные тикеты
            const typedTickets: TypedTicket[] = ticketsData.map(ticket => ({
                ...ticket,
                type: ticketType
            }));

            const filteredData = typedTickets.filter(ticket => {
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

            // Применяем сортировку
            let sortedData = [...filteredData];
            if (filterParams.sortBy) {
                sortedData = sortTickets(sortedData, filterParams.sortBy);
            }

            const ticketsWithUsers: SearchResult[] = await Promise.all(
                sortedData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticketType);
                    const authorId = ticketType === 'client' ? ticket.author?.id : ticket.master?.id;

                    const formattedDate = ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString('ru-RU')
                        : 'Дата не указана';

                    return {
                        id: ticket.id,
                        title: ticket.title,
                        price: ticket.budget,
                        unit: ticket.unit?.title || 'TJS',
                        description: ticket.description,
                        address: getFormattedAddress(ticket),
                        date: formattedDate,
                        author: userName,
                        authorId,
                        timeAgo: getTimeAgo(ticket.createdAt),
                        category: ticket.category?.title || 'другое',
                        type: ticketType
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
    }, [userRole, fetchAllTickets, getUserName, getFormattedAddress, getTimeAgo, sortTickets]);

    // Оптимизированный обработчик поиска
    const handleSearch = useCallback(async () => {
        if (isSearchInProgressRef.current) {
            console.log('Search already in progress, skipping...');
            return;
        }

        const currentSearch = {
            query: searchQuery.trim(),
            filters,
            userRole
        };
        const previousSearch = previousSearchRef.current;

        const hasQueryChanged = currentSearch.query !== previousSearch.query;
        const hasFiltersChanged =
            currentSearch.filters.minPrice !== previousSearch.filters.minPrice ||
            currentSearch.filters.maxPrice !== previousSearch.filters.maxPrice ||
            currentSearch.filters.category !== previousSearch.filters.category ||
            currentSearch.filters.rating !== previousSearch.filters.rating ||
            currentSearch.filters.reviewCount !== previousSearch.filters.reviewCount ||
            currentSearch.filters.sortBy !== previousSearch.filters.sortBy;
        const hasRoleChanged = currentSearch.userRole !== previousSearch.userRole;

        if (!hasQueryChanged && !hasFiltersChanged && !hasRoleChanged) {
            console.log('Search parameters unchanged, skipping...');
            return;
        }

        if (!currentSearch.query &&
            !filters.minPrice &&
            !filters.maxPrice &&
            !filters.category &&
            !filters.rating &&
            !filters.reviewCount &&
            !filters.sortBy) {
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
        setFilters({
            minPrice: '',
            maxPrice: '',
            category: '',
            rating: '',
            reviewCount: '',
            sortBy: ''
        });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
        previousSearchRef.current = {
            query: searchQuery,
            filters: {
                minPrice: '',
                maxPrice: '',
                category: '',
                rating: '',
                reviewCount: '',
                sortBy: ''
            },
            userRole
        };
    }, [searchQuery, userRole, onSearchResults]);

    const handleFilterChange = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);
    }, []);

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
    }, [
        searchQuery,
        filters.minPrice,
        filters.maxPrice,
        filters.category,
        filters.rating,
        filters.reviewCount,
        filters.sortBy,
        userRole,
        handleSearch
    ]);

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
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_710_4461)">
                                    <g clipPath="url(#clip1_710_4461)">
                                        <path d="M12.453 3.54667C13.1563 3.54667 13.7264 2.97658 13.7264 2.27333C13.7264 1.57009 13.1563 1 12.453 1C11.7498 1 11.1797 1.57009 11.1797 2.27333C11.1797 2.97658 11.7498 3.54667 12.453 3.54667Z" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M3.54677 9.27323C4.25001 9.27323 4.8201 8.70314 4.8201 7.9999C4.8201 7.29665 4.25001 6.72656 3.54677 6.72656C2.84353 6.72656 2.27344 7.29665 2.27344 7.9999C2.27344 8.70314 2.84353 9.27323 3.54677 9.27323Z" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M7.9999 14.9998C8.70314 14.9998 9.27323 14.4297 9.27323 13.7265C9.27323 13.0232 8.70314 12.4531 7.9999 12.4531C7.29665 12.4531 6.72656 13.0232 6.72656 13.7265C6.72656 14.4297 7.29665 14.9998 7.9999 14.9998Z" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M0.366211 2.27344H11.1795" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M13.7266 2.27344H15.6332" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M0.366211 8H2.27288" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M4.82031 8H15.6336" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M0.366211 13.7266H6.72621" stroke="#3A54DA" strokeMiterlimit="10"/>
                                        <path d="M9.27344 13.7266H15.6334" stroke="#3A54DA" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_710_4461">
                                        <rect width="16" height="16" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_710_4461">
                                        <rect width="16" height="16" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>Фильтры</p>
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