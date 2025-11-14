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
    createdAt: string;
    master: { id: number } | null;
    author: { id: number } | null;
    category: { title: string };
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
    timeAgo: string;
    category: string;
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
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const [usersCache, setUsersCache] = useState<Map<number, User>>(new Map());
    const navigate = useNavigate();

    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);
        fetchCategories();
    }, []);

    useEffect(() => {
        console.log('Filters changed:', filters);
        if (userRole && (filters.minPrice || filters.maxPrice || filters.category)) {
            console.log('Auto-searching due to filter change');
            handleSearch();
        }
    }, [filters]);

    const handleCardClick = (orderId: number) => {
        navigate(`/order/${orderId}`);
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
                setCategories(categoriesData);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Функция для получения данных пользователя по author.id
    const fetchUser = async (userId: number): Promise<User | null> => {
        try {
            // Проверяем кэш
            if (usersCache.has(userId)) {
                return usersCache.get(userId) || null;
            }

            const token = getAuthToken();
            if (!token) return null;

            // Определяем endpoint в зависимости от роли текущего пользователя
            let endpoint = '';
            if (userRole === 'client') {
                // Если текущий пользователь - клиент, ищем мастера
                endpoint = `/api/users/masters`;
            } else if (userRole === 'master') {
                // Если текущий пользователь - мастер, ищем клиента
                endpoint = `/api/users/clients`;
            } else {
                return null;
            }

            console.log(`Fetching users from: ${endpoint} for user ID: ${userId}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error(`Failed to fetch users: ${response.status}`);
                return null;
            }

            const usersData: User[] = await response.json();
            console.log(`Fetched all users:`, usersData);

            // Ищем пользователя по ID в массиве
            const userData = usersData.find(user => user.id === userId) || null;

            if (userData) {
                setUsersCache(prev => new Map(prev).set(userId, userData));
            }

            return userData;
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
        }
    };

    // Функция для получения имени пользователя в зависимости от роли
    const getUserName = async (ticket: ApiTicket): Promise<string> => {
        console.log('Getting user name for ticket:', ticket);

        let userId: number | null = null;

        // Определяем, чье имя нам нужно получить
        if (userRole === 'client') {
            // Если текущий пользователь - клиент, показываем имя мастера
            userId = ticket.master?.id || null;
            console.log('Client role: fetching master name for ID:', userId);
        } else if (userRole === 'master') {
            // Если текущий пользователь - мастер, показываем имя клиента (автора)
            userId = ticket.author?.id || null;
            console.log('Master role: fetching client name for ID:', userId);
        }

        if (userId) {
            console.log('Fetching user data for user ID:', userId);
            const user = await fetchUser(userId);

            if (user?.name && user?.surname) {
                return `${user.name} ${user.surname}`.trim();
            } else if (user?.name) {
                return user.name;
            } else if (user?.surname) {
                return user.surname;
            }
            return 'Пользователь не найден';
        }

        return userRole === 'client' ? 'Мастер не назначен' : 'Клиент не указан';
    };

    const fetchTickets = async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) return [];

            const params = new URLSearchParams();

            // Добавляем параметры поиска только если есть запрос
            if (query.trim()) {
                params.append('title', query.trim());
                console.log('Adding search query:', query.trim());
            }

            // Добавляем фильтры бюджета
            if (filterParams.minPrice) {
                params.append('minBudget', filterParams.minPrice);
                console.log('Adding min budget filter:', filterParams.minPrice);
            }
            if (filterParams.maxPrice) {
                params.append('maxBudget', filterParams.maxPrice);
                console.log('Adding max budget filter:', filterParams.maxPrice);
            }

            // Добавляем фильтр категории
            if (filterParams.category) {
                params.append('category', filterParams.category);
                console.log('Adding category filter:', filterParams.category);
            }

            console.log('Final API params:', params.toString());

            let endpoint = '';
            if (userRole === 'client') {
                endpoint = '/api/tickets/masters';
            } else if (userRole === 'master') {
                endpoint = '/api/tickets/clients';
            } else {
                console.error('Unknown user role');
                return [];
            }

            console.log('API URL:', `${API_BASE_URL}${endpoint}?${params.toString()}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('Response status:', response.status);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const ticketsData: ApiTicket[] = await response.json();
            console.log('Received tickets data:', ticketsData);

            // Если есть поисковый запрос, дополнительно фильтруем на клиенте
            let filteredData = ticketsData;

            if (query.trim()) {
                const searchTerm = query.trim().toLowerCase();
                filteredData = filteredData.filter(ticket =>
                    ticket.title.toLowerCase().includes(searchTerm) ||
                    ticket.description.toLowerCase().includes(searchTerm) ||
                    (ticket.category?.title && ticket.category.title.toLowerCase().includes(searchTerm))
                );
                console.log(`Filtered by search query "${query}":`, filteredData);
            }

            // Дополнительная фильтрация по бюджету на клиенте (на случай если API не до конца работает)
            if (filterParams.minPrice) {
                const minPrice = parseInt(filterParams.minPrice);
                filteredData = filteredData.filter(ticket => ticket.budget >= minPrice);
                console.log(`Filtered by min price ${minPrice}:`, filteredData);
            }

            if (filterParams.maxPrice) {
                const maxPrice = parseInt(filterParams.maxPrice);
                filteredData = filteredData.filter(ticket => ticket.budget <= maxPrice);
                console.log(`Filtered by max price ${maxPrice}:`, filteredData);
            }

            // Фильтрация по категории на клиенте
            if (filterParams.category) {
                filteredData = filteredData.filter(ticket =>
                    ticket.category?.title === filterParams.category
                );
                console.log(`Filtered by category ${filterParams.category}:`, filteredData);
            }

            // Создаем массив промисов для получения имен пользователей
            console.log('Starting to fetch user names...');
            const ticketsWithUsers = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket);
                    console.log(`User name for ticket ${ticket.id}:`, userName);

                    return {
                        id: ticket.id,
                        title: ticket.title,
                        price: ticket.budget,
                        unit: ticket.unit?.title || 'руб',
                        description: ticket.description,
                        address: `${ticket.address?.city?.title || ''}, ${ticket.address?.title || ''}`.trim(),
                        date: 'Даты нет в ендпоинте',
                        author: userName,
                        timeAgo: 'дата будет после как появится',
                        category: ticket.category?.title || 'другое'
                    };
                })
            );

            console.log('Final tickets with users:', ticketsWithUsers);
            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };


    const handleSearch = async () => {
        if (!userRole) {
            console.error('User role not defined');
            return;
        }

        if (!searchQuery.trim() && !filters.minPrice && !filters.maxPrice && !filters.category) {
            setShowResults(false);
            setSearchResults([]);
            onSearchResults([]);
            return;
        }

        console.log('Starting search with:', { searchQuery, filters, userRole });
        const results = await fetchTickets(searchQuery, filters);
        console.log('Search results:', results);
        setSearchResults(results);
        setShowResults(true);
        onSearchResults(results);
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            console.log('Search triggered:', { searchQuery, filters, userRole });

            if (!userRole) {
                console.log('No user role defined');
                return;
            }

            if (searchQuery.trim() || filters.minPrice || filters.maxPrice || filters.category) {
                console.log('Calling handleSearch');
                handleSearch();
            } else {
                console.log('Clearing results - no search criteria');
                setShowResults(false);
                setSearchResults([]);
                onSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [searchQuery, filters, userRole]);

    const handleFilterToggle = (isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    };

    const handleFilterChange = (newFilters: FilterState) => {
        console.log('New filters from FilterPanel:', newFilters);
        setFilters(newFilters);
    };

    const handleResetFilters = () => {
        console.log('Resetting filters');
        setFilters({ minPrice: '', maxPrice: '', category: '' });
        setShowResults(false);
        setSearchResults([]);
        onSearchResults([]);
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
                        <h2 className={styles.title}>
                            {userRole === 'client' ? 'Поиск специалистов' : 'Поиск заказов'}
                        </h2>
                        <div className={styles.search_wrap}>
                            <input
                                type="text"
                                placeholder={userRole === 'client' ? "Что хотите найти" : "Какую услугу ищете"}
                                className={styles.input}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button className={styles.button} onClick={handleSearch} disabled={isLoading}>
                                {isLoading ? 'Поиск...' : 'Найти'}
                            </button>
                        </div>

                        {/* Отладочная информация */}
                        {/*<div style={{*/}
                        {/*    padding: '10px',*/}
                        {/*    background: '#f5f5f5',*/}
                        {/*    margin: '10px 0',*/}
                        {/*    borderRadius: '8px',*/}
                        {/*    fontSize: '14px'*/}
                        {/*}}>*/}
                        {/*    <strong>Отладка:</strong> Роль: {userRole || 'не определена'} |*/}
                        {/*    Результаты: {searchResults.length} |*/}
                        {/*    Загрузка: {isLoading ? 'да' : 'нет'}*/}
                        {/*</div>*/}

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
                                     onClick={() => handleCardClick(result.id)}
                                     style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.resultHeader}>
                                        <h3>{result.title}</h3>
                                        <span className={styles.price}>{result.price} руб {result.unit}</span>
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