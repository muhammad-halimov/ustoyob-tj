import styles from './Search.module.scss';
import { useState, useEffect } from "react";
import FilterPanel from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import {useNavigate} from "react-router-dom";

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
    const [usersCache, setUsersCache] = useState<Map<number, User>>(new Map());
    const navigate = useNavigate();


    useEffect(() => {
        const role = getUserRole();
        console.log('Detected user role:', role);
        setUserRole(role);
        fetchCategories();
    }, []);

    // useEffect(() => {
    //     if (filters.minPrice || filters.maxPrice || filters.category || searchQuery) {
    //         // handleSearch();
    //     }
    // }, [filters]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            console.log('Filters changed, triggering search:', { filters, searchQuery, userRole });

            if (filters.minPrice || filters.maxPrice || filters.category || searchQuery.trim()) {
                console.log('Calling handleSearch from filters effect');
                handleSearch();
            } else {
                console.log('Clearing results - no search criteria in filters');
                setShowResults(false);
                setSearchResults([]);
                onSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [filters]);

    const handleCardClick = (authorId?: number) => {
        if (!authorId) {
            console.log('No author ID available');
            return;
        }
        console.log('Navigating to user profile:', authorId);
        navigate(`/order/${authorId}`);
    };

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
                // Убедимся, что данные имеют правильную структуру
                const formatted = categoriesData.map((cat: any) => ({
                    id: cat.id,
                    name: cat.title
                }));
                setCategories(formatted);
                console.log('Fetched categories:', formatted);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Функция для получения данных пользователя
    const fetchUser = async (userId: number, userType: 'client' | 'master'): Promise<User | null> => {
        try {
            // Проверяем кэш
            if (usersCache.has(userId)) {
                return usersCache.get(userId) || null;
            }

            const token = getAuthToken();
            if (!token) return null;

            let endpoint = '';
            if (userType === 'master') {
                endpoint = `/api/users/masters`;
            } else if (userType === 'client') {
                endpoint = `/api/users/clients`;
            }

            console.log(`Fetching ${userType} users from: ${endpoint} for user ID: ${userId}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error(`Failed to fetch ${userType} users: ${response.status}`);
                return null;
            }

            const usersData: User[] = await response.json();
            console.log(`Fetched ${userType} users:`, usersData);

            // Ищем пользователя по ID в массиве
            const userData = usersData.find(user => user.id === userId) || null;

            if (userData) {
                setUsersCache(prev => new Map(prev).set(userId, userData));
            }

            return userData;
        } catch (error) {
            console.error(`Error fetching ${userType} user ${userId}:`, error);
            return null;
        }
    };

    // Функция для получения имени пользователя
    const getUserName = async (ticket: ApiTicket, ticketType: 'client' | 'master'): Promise<string> => {
        console.log('Getting user name for ticket:', ticket, 'type:', ticketType);

        let userId: number | null = null;
        let userType: 'client' | 'master' = 'client';

        if (ticketType === 'client') {
            userId = ticket.author?.id || null;
            userType = 'client';
        } else if (ticketType === 'master') {
            userId = ticket.master?.id || null;
            userType = 'master';
        }

        if (userId) {
            console.log('Fetching user data for user ID:', userId, 'type:', userType);
            const user = await fetchUser(userId, userType);

            if (user?.name && user?.surname) {
                return `${user.name} ${user.surname}`.trim();
            } else if (user?.name) {
                return user.name;
            } else if (user?.surname) {
                return user.surname;
            }
            return 'Пользователь не найден';
        }

        return ticketType === 'client' ? 'Клиент не указан' : 'Мастер не назначен';
    };

    // Функция для получения всех тикетов (и от клиентов, и от мастеров)
    const fetchAllTickets = async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            // ИЗМЕНЕНИЕ: Разрешаем запросы без токена для неавторизованных пользователей
            if (!token) {
                console.log('No token available, making unauthenticated requests');
                // Для неавторизованных можно попробовать сделать запросы без токена
                // или использовать другой подход
            }

            const params = new URLSearchParams();

            if (query.trim()) {
                params.append('title', query.trim());
            }

            if (filterParams.minPrice) {
                params.append('minBudget', filterParams.minPrice);
            }
            if (filterParams.maxPrice) {
                params.append('maxBudget', filterParams.maxPrice);
            }

            // ВАЖНО: передаем ID категории в параметрах API
            if (filterParams.category) {
                params.append('category.id', filterParams.category);
            }

            console.log('Fetching all tickets with params:', params.toString());

            // Создаем базовые заголовки
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            // Добавляем токен если есть
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Получаем тикеты от клиентов
            const clientResponse = await fetch(`${API_BASE_URL}/api/tickets/clients?${params.toString()}`, {
                method: 'GET',
                headers: headers,
            });

            // Получаем тикеты от мастеров
            const masterResponse = await fetch(`${API_BASE_URL}/api/tickets/masters?${params.toString()}`, {
                method: 'GET',
                headers: headers,
            });

            console.log('Client response status:', clientResponse.status);
            console.log('Master response status:', masterResponse.status);

            // Обрабатываем ответы - если 401, просто продолжаем с пустыми данными
            let clientTickets: ApiTicket[] = [];
            let masterTickets: ApiTicket[] = [];

            if (clientResponse.ok) {
                clientTickets = await clientResponse.json();
            } else if (clientResponse.status === 401) {
                console.log('Client tickets: Unauthorized, returning empty array');
            } else {
                console.error('Client tickets error:', clientResponse.status);
            }

            if (masterResponse.ok) {
                masterTickets = await masterResponse.json();
            } else if (masterResponse.status === 401) {
                console.log('Master tickets: Unauthorized, returning empty array');
            } else {
                console.error('Master tickets error:', masterResponse.status);
            }

            console.log('Received client tickets:', clientTickets.length);
            console.log('Received master tickets:', masterTickets.length);

            // Объединяем все тикеты
            const allTickets = [
                ...clientTickets.map(ticket => ({ ...ticket, type: 'client' as const })),
                ...masterTickets.map(ticket => ({ ...ticket, type: 'master' as const }))
            ];

            console.log('All tickets combined:', allTickets.length);

            // Дополнительная фильтрация на клиенте
            let filteredData = allTickets;

            if (query.trim()) {
                const searchTerm = query.trim().toLowerCase();
                filteredData = filteredData.filter(ticket =>
                    ticket.title.toLowerCase().includes(searchTerm) ||
                    ticket.description.toLowerCase().includes(searchTerm) ||
                    (ticket.category?.title && ticket.category.title.toLowerCase().includes(searchTerm))
                );
            }

            if (filterParams.minPrice) {
                const minPrice = parseInt(filterParams.minPrice);
                filteredData = filteredData.filter(ticket => ticket.budget >= minPrice);
            }

            if (filterParams.maxPrice) {
                const maxPrice = parseInt(filterParams.maxPrice);
                filteredData = filteredData.filter(ticket => ticket.budget <= maxPrice);
            }

            // Фильтрация по категории на клиенте
            if (filterParams.category) {
                filteredData = filteredData.filter(ticket =>
                    ticket.category?.id.toString() === filterParams.category
                );
            }

            console.log('Filtered tickets:', filteredData.length);

            // Создаем массив промисов для получения имен пользователей
            const ticketsWithUsers = await Promise.all(
                filteredData.map(async (ticket) => {
                    // Для неавторизованных пользователей используем базовую информацию
                    let userName = 'Пользователь';
                    let authorId: number | undefined = undefined;

                    if (ticket.type === 'client') {
                        authorId = ticket.author?.id || undefined;
                        userName = ticket.author?.id ? 'Клиент' : 'Клиент не указан';
                    } else if (ticket.type === 'master') {
                        authorId = ticket.master?.id || undefined;
                        userName = ticket.master?.id ? 'Мастер' : 'Мастер не назначен';
                    }

                    // Форматируем дату
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
                        type: ticket.type
                    };
                })
            );

            console.log('Final tickets with users:', ticketsWithUsers.length);
            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для получения тикетов в зависимости от роли
    const fetchTicketsByRole = async (query: string = '', filterParams: FilterState) => {
        console.log('Fetching tickets for role:', userRole);
        console.log('Filter params:', filterParams);

        // Если пользователь не авторизован - показываем все тикеты
        if (userRole === null) {
            console.log('User not authenticated - showing all tickets');
            return await fetchAllTickets(query, filterParams);
        }

        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) return [];

            const params = new URLSearchParams();

            if (query.trim()) {
                params.append('title', query.trim());
            }

            if (filterParams.minPrice) {
                params.append('minBudget', filterParams.minPrice);
            }
            if (filterParams.maxPrice) {
                params.append('maxBudget', filterParams.maxPrice);
            }

            // ВАЖНО: передаем ID категории в параметрах API
            if (filterParams.category) {
                params.append('category.id', filterParams.category);
            }

            let endpoint = '';
            let ticketType: 'client' | 'master' = 'client';

            // Определяем endpoint и тип тикета в зависимости от роли
            if (userRole === 'client') {
                // Клиент видит тикеты от мастеров (услуги)
                endpoint = '/api/tickets/masters';
                ticketType = 'master';
            } else if (userRole === 'master') {
                // Мастер видит тикеты от клиентов (заказы)
                endpoint = '/api/tickets/clients';
                ticketType = 'client';
            }

            console.log('API URL:', `${API_BASE_URL}${endpoint}?${params.toString()}`);
            console.log('Ticket type for this role:', ticketType);

            const response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const ticketsData: ApiTicket[] = await response.json();
            console.log(`Received ${ticketType} tickets:`, ticketsData.length);

            let filteredData = ticketsData;

            // Дополнительная фильтрация на клиенте (на всякий случай)
            if (query.trim()) {
                const searchTerm = query.trim().toLowerCase();
                filteredData = filteredData.filter(ticket =>
                    ticket.title.toLowerCase().includes(searchTerm) ||
                    ticket.description.toLowerCase().includes(searchTerm) ||
                    (ticket.category?.title && ticket.category.title.toLowerCase().includes(searchTerm))
                );
            }

            if (filterParams.minPrice) {
                const minPrice = parseInt(filterParams.minPrice);
                filteredData = filteredData.filter(ticket => ticket.budget >= minPrice);
            }

            if (filterParams.maxPrice) {
                const maxPrice = parseInt(filterParams.maxPrice);
                filteredData = filteredData.filter(ticket => ticket.budget <= maxPrice);
            }

            // Фильтрация по категории на клиенте (дублирующая, но для надежности)
            if (filterParams.category) {
                filteredData = filteredData.filter(ticket =>
                    ticket.category?.id.toString() === filterParams.category
                );
            }

            console.log('Filtered tickets:', filteredData.length);

            const ticketsWithUsers = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticketType);
                    let authorId: number | undefined = undefined;

                    // Определяем authorId в зависимости от типа тикета
                    if (ticketType === 'client') {
                        authorId = ticket.author?.id || undefined;
                    } else if (ticketType === 'master') {
                        authorId = ticket.master?.id || undefined;
                    }

                    // Форматируем дату
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
    };

    // Функция для форматирования адреса без лишних запятых
    const getFormattedAddress = (ticket: ApiTicket): string => {
        const districtTitle = ticket.district?.title || '';
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';

        const city = districtCity || addressCity;
        const district = districtTitle;

        console.log('Full address data:', {
            districtTitle,
            districtCity,
            addressCity,
            addressTitle
        });

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
    };

    // Функция для форматирования времени (сколько времени прошло)
    const getTimeAgo = (dateString: string): string => {
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
    };

    const handleSearch = async () => {
        console.log('Starting search with:', {
            searchQuery,
            filters,
            userRole,
            hasQuery: !!searchQuery.trim(),
            hasFilters: !!(filters.minPrice || filters.maxPrice || filters.category)
        });

        // Если нет поискового запроса и фильтров - очищаем результаты
        if (!searchQuery.trim() && !filters.minPrice && !filters.maxPrice && !filters.category) {
            console.log('Clearing results - no search criteria');
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
            return;
        }

        try {
            const results = await fetchTicketsByRole(searchQuery, filters);
            console.log('Search completed. Results:', results.length);

            // Логируем типы тикетов для отладки
            if (results.length > 0) {
                const clientTickets = results.filter(r => r.type === 'client').length;
                const masterTickets = results.filter(r => r.type === 'master').length;
                console.log(`Ticket types - Clients: ${clientTickets}, Masters: ${masterTickets}`);
            }

            setSearchResults(results);
            setShowResults(true);
            onSearchResults(results);
        } catch (error) {
            console.error('Error in handleSearch:', error);
            setSearchResults([]);
            setShowResults(false);
            onSearchResults([]);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            console.log('Search triggered by query change:', {
                searchQuery,
                filters,
                userRole,
                hasContent: !!(searchQuery.trim() || filters.minPrice || filters.maxPrice || filters.category)
            });

            if (searchQuery.trim() || filters.minPrice || filters.maxPrice || filters.category) {
                console.log('Calling handleSearch from query effect');
                handleSearch();
            } else {
                console.log('Clearing results - no search criteria in query');
                setShowResults(false);
                setSearchResults([]);
                onSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [searchQuery, userRole]);

    const handleFilterToggle = (isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    };

    // const handleFilterChange = async (filters: FilterState) => {
    //     try {
    //         const res = await fetch('https://admin.ustoyob.tj/api/tickets/clients', {
    //             method: 'POST', // API ожидает фильтры в body
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 category: filters.category || null,
    //                 minPrice: filters.minPrice || null,
    //                 maxPrice: filters.maxPrice || null,
    //             }),
    //         });
    //         const data = await res.json();
    //         setTickets(data);
    //     } catch (err) {
    //         console.error(err);
    //     }
    // };

    const handleResetFilters = () => {
        console.log('Resetting filters');
        setFilters({ minPrice: '', maxPrice: '', category: '' });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
    };

    // Функция для отображения типа тикета
    const getTicketTypeLabel = (type: 'client' | 'master') => {
        return type === 'client' ? 'Заказ от клиента' : 'Услуга от мастера';
    };

    // Функция для получения заголовка поиска
    const getSearchTitle = () => {
        if (userRole === 'client') {
            return 'Поиск специалистов';
        } else if (userRole === 'master') {
            return 'Поиск заказов';
        } else {
            return 'Поиск услуг и заказов';
        }
    };

    // Функция для получения плейсхолдера
    const getSearchPlaceholder = () => {
        if (userRole === 'client') {
            return "Что хотите найти";
        } else if (userRole === 'master') {
            return "Какую услугу ищете";
        } else {
            return "Что ищете";
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.search_with_filters}>
                <FilterPanel
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                    }}
                    filters={filters}
                    onResetFilters={handleResetFilters}
                    categories={categories}
                />
                <div className={styles.search_content}>
                    <div className={styles.search}>
                        <h2 className={styles.title}>
                            {getSearchTitle()}
                        </h2>
                        <div className={styles.search_wrap}>
                            <input
                                type="text"
                                placeholder={getSearchPlaceholder()}
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
                                <div key={result.id}
                                     className={styles.resultCard}
                                     onClick={() => handleCardClick(result.authorId)}
                                     style={{ cursor: 'pointer' }}
                                >
                                    {/* Показываем метку типа тикета только для неавторизованных пользователей */}
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
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}