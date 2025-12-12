import styles from './Search.module.scss';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FilterPanel, { FilterState } from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

// Интерфейсы
interface ApiTicket {
    id: number;
    title: string;
    description: string;
    notice?: string;
    budget: number;
    unit: { title: string };
    addresses: {
        id: number;
        title?: string;
        province?: {
            id: number;
            title?: string;
        };
        district?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        city?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        suburb?: {
            id: number;
            title?: string;
        } | null;
        settlement?: {
            id: number;
            title?: string;
        } | null;
        village?: {
            id: number;
            title?: string;
        } | null;
        community?: {
            id: number;
            title?: string;
        } | null;
    }[];
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
        title: string;
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
    city?: string;
    date: string;
    author: string;
    authorId?: number;
    timeAgo: string;
    category: string;
    type: 'client' | 'master';
    isInSelectedCity?: boolean;
}

interface ApiReview {
    id: number;
    master?: {
        id: number;
    };
    client?: {
        id: number;
    };
}

interface HydraResponse<T> {
    'hydra:member': T[];
    'hydra:totalItems'?: number;
    'hydra:view'?: {
        '@id': string;
        '@type': string;
        'hydra:first'?: string;
        'hydra:last'?: string;
        'hydra:next'?: string;
    };
}

interface Category {
    id: number;
    name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Кэши
const categoriesCache = new Map<number, Category>();

export default function Search({ onSearchResults, onFilterToggle }: SearchProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>(() => {
        return localStorage.getItem('selectedCity') || '';
    });
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
    const [categories, setCategories] = useState<Category[]>([]);
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

    // Функция для получения информации об адресе
    const getAddressInfo = useCallback(async (ticket: ApiTicket): Promise<{
        formatted: string;
        cityName?: string;
        districtName?: string;
    }> => {
        try {
            if (!ticket.addresses || ticket.addresses.length === 0) {
                return { formatted: 'Адрес не указан' };
            }

            const address = ticket.addresses[0];
            const addressParts: string[] = [];
            let cityName = '';
            let districtName = '';

            // Провинция (область)
            if (address.province?.title) {
                addressParts.push(address.province.title);
            }

            // Город
            if (address.city?.title) {
                cityName = address.city.title;
                addressParts.push(cityName);
            }

            // Район
            if (address.district?.title) {
                districtName = address.district.title;
                addressParts.push(districtName);
            }

            // Пригород (если есть)
            if (address.suburb?.title) {
                addressParts.push(address.suburb.title);
            }

            // Поселение (если есть)
            if (address.settlement?.title) {
                addressParts.push(address.settlement.title);
            }

            // Деревня (если есть)
            if (address.village?.title) {
                addressParts.push(address.village.title);
            }

            // Сообщество (если есть)
            if (address.community?.title) {
                addressParts.push(address.community.title);
            }

            // Конкретный адрес
            if (address.title) {
                addressParts.push(address.title);
            }

            const uniqueParts = Array.from(new Set(addressParts.filter(part => part && part.trim())));
            const formatted = uniqueParts.length === 0 ? 'Адрес не указан' : uniqueParts.join(', ');

            return {
                formatted,
                cityName: cityName || undefined,
                districtName: districtName || undefined
            };

        } catch (error) {
            console.error('Error formatting address:', error);
            return { formatted: 'Адрес не указан' };
        }
    }, []);

    // Функция для определения приоритета тикета по городу
    const getTicketPriority = useCallback(async (ticket: ApiTicket): Promise<number> => {
        if (!selectedCity || !selectedCity.trim()) {
            return 0;
        }

        try {
            const addressInfo = await getAddressInfo(ticket);
            const cityName = addressInfo.cityName?.toLowerCase() || '';
            const districtName = addressInfo.districtName?.toLowerCase() || '';
            const fullAddress = addressInfo.formatted.toLowerCase();
            const searchCity = selectedCity.toLowerCase();

            // Проверяем несколько вариантов совпадения
            if (cityName.includes(searchCity) ||
                districtName.includes(searchCity) ||
                fullAddress.includes(searchCity)) {
                return 2; // Высший приоритет - точное совпадение города/района
            }

            // Проверяем частичное совпадение
            const searchCityWords = searchCity.split(' ');
            const hasPartialMatch = searchCityWords.some(word =>
                cityName.includes(word) ||
                districtName.includes(word) ||
                fullAddress.includes(word)
            );

            return hasPartialMatch ? 1 : 0; // Средний приоритет для частичного совпадения

        } catch (error) {
            console.error('Error checking city priority:', error);
            return 0;
        }
    }, [selectedCity, getAddressInfo]);

    // Функция сортировки с учетом приоритета города
    const sortTicketsWithPriority = useCallback(async (tickets: TypedTicket[], sortBy: string): Promise<TypedTicket[]> => {
        // Получаем приоритет для каждого тикета
        const ticketsWithPriority = await Promise.all(
            tickets.map(async (ticket) => ({
                ticket,
                priority: await getTicketPriority(ticket)
            }))
        );

        // Сортируем по приоритету города, затем по выбранной сортировке
        return ticketsWithPriority
            .sort((a, b) => {
                // Сначала по приоритету города
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }

                // Затем по выбранной сортировке
                switch (sortBy) {
                    case 'rating_desc':
                        return (b.ticket.userRating || 0) - (a.ticket.userRating || 0);
                    case 'rating_asc':
                        return (a.ticket.userRating || 0) - (b.ticket.userRating || 0);
                    case 'reviews_desc':
                        return b.ticket.userReviewCount - a.ticket.userReviewCount;
                    case 'reviews_asc':
                        return a.ticket.userReviewCount - b.ticket.userReviewCount;
                    case 'price_desc':
                        return b.ticket.budget - a.ticket.budget;
                    case 'price_asc':
                        return a.ticket.budget - b.ticket.budget;
                    case 'date_desc':
                        return new Date(b.ticket.createdAt).getTime() - new Date(a.ticket.createdAt).getTime();
                    case 'date_asc':
                        return new Date(a.ticket.createdAt).getTime() - new Date(b.ticket.createdAt).getTime();
                    default:
                        return new Date(b.ticket.createdAt).getTime() - new Date(a.ticket.createdAt).getTime();
                }
            })
            .map(item => item.ticket);
    }, [getTicketPriority]);

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

    // Функция получения имени пользователя
    const getUserName = useCallback(async (ticket: ApiTicket, ticketType: 'client' | 'master'): Promise<string> => {
        const userId = ticketType === 'client' ? ticket.author?.id : ticket.master?.id;

        if (!userId) {
            return ticketType === 'client' ? 'Клиент не указан' : 'Мастер не назначен';
        }

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

    // Функция загрузки категорий
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

                let formatted: Category[] = [];
                if (Array.isArray(categoriesData)) {
                    formatted = categoriesData.map((cat: { id: number; title: string }) => ({
                        id: cat.id,
                        name: cat.title
                    }));
                } else if (categoriesData && typeof categoriesData === 'object' && 'hydra:member' in categoriesData) {
                    const hydraMember = (categoriesData as { 'hydra:member': { id: number; title: string }[] })['hydra:member'];
                    if (Array.isArray(hydraMember)) {
                        formatted = hydraMember.map((cat: { id: number; title: string }) => ({
                            id: cat.id,
                            name: cat.title
                        }));
                    }
                }

                formatted.forEach((cat: Category) => {
                    categoriesCache.set(cat.id, cat);
                });

                setCategories(formatted);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // Функция для фильтрации по количеству отзывов
    const filterByReviewCount = useCallback(async (tickets: TypedTicket[], minReviews: number): Promise<TypedTicket[]> => {
        try {
            const token = getAuthToken();

            const reviewsResponse = await fetch(`${API_BASE_URL}/api/reviews`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!reviewsResponse.ok) {
                console.error('Failed to fetch reviews for filtering');
                return tickets;
            }

            const reviewsData = await reviewsResponse.json();
            let reviewsArray: ApiReview[] = [];

            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && typeof reviewsData === 'object' && 'hydra:member' in reviewsData) {
                const hydraData = reviewsData as HydraResponse<ApiReview>;
                reviewsArray = hydraData['hydra:member'];
            }

            const userReviewCount = new Map<number, number>();

            reviewsArray.forEach((review: ApiReview) => {
                if (review.master?.id) {
                    const count = userReviewCount.get(review.master.id) || 0;
                    userReviewCount.set(review.master.id, count + 1);
                }
                if (review.client?.id) {
                    const count = userReviewCount.get(review.client.id) || 0;
                    userReviewCount.set(review.client.id, count + 1);
                }
            });

            return tickets.filter(ticket => {
                const userId = ticket.type === 'client' ? ticket.author?.id : ticket.master?.id;
                if (!userId) return false;

                const userReviews = userReviewCount.get(userId) || 0;
                return userReviews >= minReviews;
            });

        } catch (error) {
            console.error('Error filtering by review count:', error);
            return tickets;
        }
    }, []);

    // Функция для очистки текста
    const cleanText = useCallback((text: string): string => {
        if (!text) return '';

        let cleaned = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&hellip;/g, '...')
            .replace(/&mdash;/g, '—')
            .replace(/&laquo;/g, '«')
            .replace(/&raquo;/g, '»');

        cleaned = cleaned.replace(/&[a-z]+;/g, ' ');
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        cleaned = cleaned
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return cleaned;
    }, []);

    // Функция получения тикетов с API
    const fetchAllTickets = useCallback(async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const params = new URLSearchParams();
            params.append('active', 'true');

            if (userRole === 'client') {
                params.append('service', 'true');
            } else if (userRole === 'master') {
                params.append('service', 'false');
            }

            if (filterParams.category) {
                params.append('category', filterParams.category);
            }

            if (filterParams.minPrice || filterParams.maxPrice) {
                if (filterParams.minPrice && filterParams.maxPrice) {
                    params.append('budget[between]', `${filterParams.minPrice}..${filterParams.maxPrice}`);
                } else if (filterParams.minPrice) {
                    params.append('budget[gte]', filterParams.minPrice);
                } else if (filterParams.maxPrice) {
                    params.append('budget[lte]', filterParams.maxPrice);
                }
            }

            if (filterParams.rating) {
                if (userRole === 'client') {
                    params.append('master.rating[gte]', filterParams.rating);
                } else if (userRole === 'master') {
                    params.append('author.rating[gte]', filterParams.rating);
                } else {
                    params.append('author.rating[gte]', filterParams.rating);
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
            let ticketsData: ApiTicket[] = [];

            if (Array.isArray(responseData)) {
                ticketsData = responseData;
            } else if (responseData && typeof responseData === 'object' && 'hydra:member' in responseData) {
                const hydraMember = (responseData as { 'hydra:member': ApiTicket[] })['hydra:member'];
                if (Array.isArray(hydraMember)) {
                    ticketsData = hydraMember;
                }
            }

            console.log(`Loaded ${ticketsData.length} tickets from API`);

            // Фильтрация по поисковому запросу
            if (query.trim()) {
                const searchLower = query.trim().toLowerCase();
                console.log(`Filtering by search query: "${searchLower}"`);

                ticketsData = ticketsData.filter((ticket: ApiTicket) => {
                    const desc = ticket.description?.toLowerCase() || '';
                    const title = ticket.title?.toLowerCase() || '';
                    const category = ticket.category?.title?.toLowerCase() || '';

                    let addressMatches = false;
                    if (ticket.addresses && ticket.addresses.length > 0) {
                        const address = ticket.addresses[0];
                        const provinceTitle = address.province?.title?.toLowerCase() || '';
                        const cityTitle = address.city?.title?.toLowerCase() || '';
                        const districtTitle = address.district?.title?.toLowerCase() || '';
                        const addressTitle = address.title?.toLowerCase() || '';

                        addressMatches =
                            provinceTitle.includes(searchLower) ||
                            cityTitle.includes(searchLower) ||
                            districtTitle.includes(searchLower) ||
                            addressTitle.includes(searchLower);
                    }

                    return desc.includes(searchLower) ||
                        title.includes(searchLower) ||
                        category.includes(searchLower) ||
                        addressMatches;
                });

                console.log(`After filtering by "${query}": ${ticketsData.length} tickets`);
            }

            // Определяем тип тикета
            const typedTickets: TypedTicket[] = ticketsData.map(ticket => {
                const ticketType = ticket.service === true ? 'master' : 'client';
                let userRating = 0;
                if (ticketType === 'client') {
                    userRating = ticket.author?.rating || 0;
                } else {
                    userRating = ticket.master?.rating || 0;
                }

                return {
                    ...ticket,
                    type: ticketType,
                    userRating,
                    userReviewCount: 0
                };
            });

            let filteredData = typedTickets;

            // Фильтрация по количеству отзывов
            if (filterParams.reviewCount) {
                const minReviews = parseInt(filterParams.reviewCount);
                filteredData = await filterByReviewCount(filteredData, minReviews);
            }

            // Сортировка с учетом приоритета города
            if (filterParams.sortBy || selectedCity) {
                filteredData = await sortTicketsWithPriority(filteredData, filterParams.sortBy || 'date_desc');
            }

            // Создаем финальные результаты
            const ticketsWithUsers: SearchResult[] = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticket.type);
                    const authorId = ticket.type === 'client' ? ticket.author?.id : ticket.master?.id;
                    const addressInfo = await getAddressInfo(ticket);
                    const priority = await getTicketPriority(ticket);

                    const formattedDate = ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString('ru-RU')
                        : 'Дата не указана';

                    return {
                        id: ticket.id,
                        title: ticket.title || 'Без названия',
                        price: ticket.budget || 0,
                        unit: ticket.unit?.title || 'TJS',
                        description: ticket.description,
                        address: addressInfo.formatted,
                        city: addressInfo.cityName,
                        date: formattedDate,
                        author: userName,
                        authorId,
                        timeAgo: getTimeAgo(ticket.createdAt),
                        category: ticket.category?.title || 'другое',
                        type: ticket.type,
                        isInSelectedCity: priority > 0
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
    }, [userRole, filterByReviewCount, selectedCity, sortTicketsWithPriority, getUserName, getAddressInfo, getTicketPriority, getTimeAgo]);

    // Флаг для предотвращения дублирующих запросов
    const isSearchInProgressRef = useRef(false);

    // Обработчик поиска
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

    // Следим за изменениями в localStorage для города
    useEffect(() => {
        const handleStorageChange = () => {
            const city = localStorage.getItem('selectedCity') || '';
            if (city !== selectedCity) {
                setSelectedCity(city);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [selectedCity]);

    // Загружаем город при монтировании
    useEffect(() => {
        const city = localStorage.getItem('selectedCity') || '';
        setSelectedCity(city);
    }, []);

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
        selectedCity,
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

                {result.isInSelectedCity && (
                    <div className={styles.cityBadge}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1C4.13 1 1 4.13 1 8C1 11.87 4.13 15 8 15C11.87 15 15 11.87 15 8C15 4.13 11.87 1 8 1Z"
                                  fill="#3A54DA"/>
                            <path d="M11.53 5.53L8 9.06L6.47 7.53L5.53 8.47L8 10.94L12.47 6.47L11.53 5.53Z"
                                  fill="white"/>
                        </svg>
                        <span>Your location</span>
                    </div>
                )}

                <div className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <span className={styles.price}>{result.price} TJS, {result.unit}</span>
                </div>
                <p className={styles.description}>{cleanText(result.description)}</p>
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
                        {/*{result.city && (*/}
                        {/*    <span className={styles.cityName}> • {result.city}</span>*/}
                        {/*)}*/}
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
    }, [isLoading, searchResults, userRole, getTicketTypeLabel, handleCardClick, cleanText]);

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