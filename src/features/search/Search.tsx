import styles from './Search.module.scss';
import {useState, useEffect, useCallback, useMemo, useRef} from "react";
import FilterPanel, { FilterState } from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import {useNavigate} from "react-router-dom";

// Интерфейсы
interface ApiTicket {
    id: number;
    title: string;
    description: string;
    notice?: string;
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
    master: {
        id: number;
        name?: string;
        surname?: string;
        rating?: number;
    } | null;
    author: {
        id: number;
        name?: string;
        surname?: string;
        rating?: number;
    } | null;
    category: {
        id: number;
        title: string
    };
    service: boolean;
    active: boolean;
}

interface TypedTicket extends ApiTicket {
    type: 'client' | 'master';
    userRating: number;
    userReviewCount: number;
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
                return sortedTickets.sort((a, b) => b.userRating - a.userRating);
            case 'rating_asc':
                return sortedTickets.sort((a, b) => a.userRating - b.userRating);
            case 'reviews_desc':
                return sortedTickets.sort((a, b) => b.userReviewCount - a.userReviewCount);
            case 'reviews_asc':
                return sortedTickets.sort((a, b) => a.userReviewCount - b.userReviewCount);
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

    // Оптимизированная функция получения имени пользователя без авторизации
    const getUserName = useCallback(async (ticket: ApiTicket, ticketType: 'client' | 'master'): Promise<string> => {
        const userId = ticketType === 'client' ? ticket.author?.id : ticket.master?.id;

        if (!userId) {
            return ticketType === 'client' ? 'Клиент не указан' : 'Мастер не назначен';
        }

        // Используем данные из тикета
        if (ticketType === 'client' && ticket.author) {
            if (ticket.author.name && ticket.author.surname) {
                return `${ticket.author.name} ${ticket.author.surname}`.trim();
            } else if (ticket.author.name) {
                return ticket.author.name;
            } else if (ticket.author.surname) {
                return ticket.author.surname;
            }
        } else if (ticketType === 'master' && ticket.master) {
            if (ticket.master.name && ticket.master.surname) {
                return `${ticket.master.name} ${ticket.master.surname}`.trim();
            } else if (ticket.master.name) {
                return ticket.master.name;
            } else if (ticket.master.surname) {
                return ticket.master.surname;
            }
        }

        return ticketType === 'client' ? 'Клиент' : 'Мастер';
    }, []);

    // Оптимизированная функция загрузки категорий
    const fetchCategories = useCallback(async () => {
        if (categoriesCache.size > 0) {
            setCategories(Array.from(categoriesCache.values()));
            return;
        }

        try {
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                method: 'GET',
                headers: headers,
            });

            if (response.ok) {
                const categoriesData = await response.json();

                // Проверяем структуру ответа
                const formatted = Array.isArray(categoriesData) ?
                    categoriesData.map((cat: any) => ({
                        id: cat.id,
                        name: cat.title
                    })) : [];

                formatted.forEach((cat: { id: number, name: string }) => {
                    categoriesCache.set(cat.id, cat);
                });

                setCategories(formatted);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // const testAllTickets = useCallback(async () => {
    //     try {
    //         console.log('Testing: Loading ALL tickets...');
    //         const response = await fetch(`${API_BASE_URL}/api/tickets`);
    //         const data = await response.json();
    //         console.log('All tickets response:', data);
    //
    //         // Проверяем разные форматы
    //         let tickets = [];
    //         if (Array.isArray(data)) {
    //             tickets = data;
    //         } else if (data && data['hydra:member']) {
    //             tickets = data['hydra:member'];
    //         }
    //
    //         console.log(`Total tickets in system: ${tickets.length}`);
    //
    //         if (tickets.length > 0) {
    //             console.log('Sample ticket:', tickets[0]);
    //             console.log('Sample ticket description:', tickets[0]?.description);
    //             console.log('Sample ticket title:', tickets[0]?.title);
    //
    //             // Проверяем, есть ли слово "поч" в описаниях
    //             const ticketsWithWord = tickets.filter((ticket: any) => {
    //                 const desc = ticket.description?.toLowerCase() || '';
    //                 const title = ticket.title?.toLowerCase() || '';
    //                 return desc.includes('поч') || title.includes('поч');
    //             });
    //
    //             console.log(`Tickets containing "поч": ${ticketsWithWord.length}`);
    //             if (ticketsWithWord.length > 0) {
    //                 console.log('Found tickets with "поч":', ticketsWithWord);
    //             }
    //         }
    //     } catch (error) {
    //         console.error('Error testing all tickets:', error);
    //     }
    // }, []);

    // Обновленная функция fetchAllTickets
    const fetchAllTickets = useCallback(async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const params = new URLSearchParams();

            // ВАЖНО: Убираем поисковый запрос из параметров API
            // так как API требует точного совпадения
            // if (query.trim()) {
            //     params.append('description', query.trim());
            // }

            // Добавляем только базовые фильтры для загрузки всех тикетов
            params.append('active', 'true');

            if (userRole === 'client') {
                params.append('service', 'true');
            } else if (userRole === 'master') {
                params.append('service', 'false');
            }

            if (filterParams.category) {
                params.append('category', filterParams.category);
            }

            // Фильтры по бюджету
            if (filterParams.minPrice || filterParams.maxPrice) {
                if (filterParams.minPrice && filterParams.maxPrice) {
                    params.append('budget[between]', `${filterParams.minPrice}..${filterParams.maxPrice}`);
                } else if (filterParams.minPrice) {
                    params.append('budget[gte]', filterParams.minPrice);
                } else if (filterParams.maxPrice) {
                    params.append('budget[lte]', filterParams.maxPrice);
                }
            }

            console.log('Loading tickets with params:', params.toString());

            const response = await fetch(`${API_BASE_URL}/api/tickets?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();

            // Получаем массив тикетов из ответа
            let ticketsData: ApiTicket[] = [];
            if (Array.isArray(responseData)) {
                ticketsData = responseData;
            } else if (responseData && responseData['hydra:member']) {
                ticketsData = responseData['hydra:member'];
            }

            console.log(`Loaded ${ticketsData.length} tickets from API`);

            // ФИЛЬТРАЦИЯ НА КЛИЕНТЕ ПО ПОИСКОВОМУ ЗАПРОСУ
            if (query.trim()) {
                const searchLower = query.trim().toLowerCase();
                console.log(`Filtering by search query: "${searchLower}"`);

                ticketsData = ticketsData.filter((ticket: ApiTicket) => {
                    const desc = ticket.description?.toLowerCase() || '';
                    const title = ticket.title?.toLowerCase() || '';
                    const category = ticket.category?.title?.toLowerCase() || '';
                    const address = ticket.address?.title?.toLowerCase() || '';

                    // Ищем в нескольких полях
                    const matches =
                        desc.includes(searchLower) ||
                        title.includes(searchLower) ||
                        category.includes(searchLower) ||
                        address.includes(searchLower);

                    if (matches) {
                        console.log(`Ticket ${ticket.id} matches:`, {
                            title: ticket.title,
                            description: ticket.description?.substring(0, 50) + '...'
                        });
                    }

                    return matches;
                });

                console.log(`After filtering by "${query}": ${ticketsData.length} tickets`);
            }

            // Определяем тип тикета
            const typedTickets: TypedTicket[] = ticketsData.map(ticket => {
                const ticketType = ticket.service === true ? 'master' : 'client';
                const userRating = ticketType === 'client' ?
                    (ticket.author?.rating || 0) :
                    (ticket.master?.rating || 0);

                return {
                    ...ticket,
                    type: ticketType,
                    userRating,
                    userReviewCount: 0
                };
            });

            // Дополнительная фильтрация по рейтингу (если нужна на клиенте)
            let filteredData = typedTickets.filter(ticket => {
                if (filterParams.rating) {
                    const minRating = parseInt(filterParams.rating);
                    if (ticket.userRating < minRating) {
                        return false;
                    }
                }
                if (filterParams.reviewCount) {
                    const minReviews = parseInt(filterParams.reviewCount);
                    if (ticket.userReviewCount < minReviews) {
                        return false;
                    }
                }
                return true;
            });

            // Сортировка
            if (filterParams.sortBy) {
                filteredData = sortTickets(filteredData, filterParams.sortBy);
            }

            // Создаем результаты поиска
            const ticketsWithUsers: SearchResult[] = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticket.type);
                    const authorId = ticket.type === 'client' ? ticket.author?.id : ticket.master?.id;

                    const formattedDate = ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString('ru-RU')
                        : 'Дата не указана';

                    return {
                        id: ticket.id,
                        title: ticket.title || 'Без названия',
                        price: ticket.budget || 0,
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
                })
            );

            console.log('Final results to display:', ticketsWithUsers.length);

            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [getFormattedAddress, getTimeAgo, sortTickets, getUserName, userRole]);

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
            !filters.reviewCount) {
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

            const results = await fetchAllTickets(searchQuery, filters);
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
    }, [searchQuery, filters, userRole, fetchAllTickets, onSearchResults]);

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

                        {(filters.minPrice || filters.maxPrice || filters.category || filters.rating || filters.reviewCount) && (
                            <div className={styles.active_filters}>
                                <span>Активные фильтры:</span>
                                {filters.minPrice && <span className={styles.filter_tag}>От {filters.minPrice} TJS</span>}
                                {filters.maxPrice && <span className={styles.filter_tag}>До {filters.maxPrice} TJS</span>}
                                {filters.category && (
                                    <span className={styles.filter_tag}>
                    {categories.find(cat => cat.id.toString() === filters.category)?.name}
                </span>
                                )}
                                {filters.rating && <span className={styles.filter_tag}>{filters.rating}+ звезд</span>}
                                {filters.reviewCount && <span className={styles.filter_tag}>{filters.reviewCount}+ отзывов</span>}
                                <button
                                    className={styles.clear_filters_btn}
                                    onClick={handleResetFilters}
                                >
                                    Очистить все
                                </button>
                            </div>
                        )}

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