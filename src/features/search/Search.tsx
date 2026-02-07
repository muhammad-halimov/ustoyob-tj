import styles from './Search.module.scss';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FilterPanel, { FilterState } from "../filters/FilterPanel.tsx";
import { getAuthToken, getUserRole } from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import {cleanText} from "../../utils/cleanText.ts";
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from "../../hooks/useLanguageChange";
import { AnnouncementCard } from "../../shared/ui/AnnouncementCard/AnnouncementCard";

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
    reviewsCount: number;
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
    userRating?: number;
    userReviewCount?: number;
}



interface Category {
    id: number;
    name: string;
}

interface Occupation {
    id: number;
    title: string;
    categories: {
        id: number;
        title: string;
    }[];
}

interface City {
    id: number;
    name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Search({ onSearchResults, onFilterToggle }: SearchProps) {
    const { t } = useTranslation('components');
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
        subcategory: '', // Добавляем подкатегорию
        rating: '',
        reviewCount: '',
        sortBy: '',
        city: '' // Добавляем город в фильтры
    });
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [cities, setCities] = useState<City[]>([]); // Состояние для городов
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
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            city: ''
        },
        userRole: null
    });

    // Функция для загрузки городов из API
    const fetchCities = useCallback(async () => {
        try {
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Загружаем города из адресов тикетов или отдельного эндпоинта
            const response = await fetch(`${API_BASE_URL}/api/cities?locale=${locale}`, {
                method: 'GET',
                headers: headers,
            });

            if (response.ok) {
                const citiesData = await response.json();
                let formatted: City[] = [];

                if (Array.isArray(citiesData)) {
                    formatted = citiesData.map((city: { id: number; title: string }) => ({
                        id: city.id,
                        name: city.title
                    }));
                } else if (citiesData && typeof citiesData === 'object' && 'hydra:member' in citiesData) {
                    const hydraMember = (citiesData as { 'hydra:member': { id: number; title: string }[] })['hydra:member'];
                    if (Array.isArray(hydraMember)) {
                        formatted = hydraMember.map((city: { id: number; title: string }) => ({
                            id: city.id,
                            name: city.title
                        }));
                    }
                }

                // Удаляем дубликаты по имени
                const uniqueCities = formatted.reduce((acc: City[], current) => {
                    if (!acc.find(city => city.name.toLowerCase() === current.name.toLowerCase())) {
                        acc.push(current);
                    }
                    return acc;
                }, []);

                // Сортируем по алфавиту
                uniqueCities.sort((a, b) => a.name.localeCompare(b.name));

                setCities(uniqueCities);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            // Если нет отдельного эндпоинта для городов, попробуем получить города из тикетов
            await extractCitiesFromTickets();
        }
    }, []);

    // Функция для извлечения городов из существующих тикетов
    const extractCitiesFromTickets = useCallback(async () => {
        try {
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/tickets?active=true&itemsPerPage=100&locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
                method: 'GET',
                headers: headers,
            });

            if (response.ok) {
                const ticketsData = await response.json();
                let tickets: ApiTicket[] = [];

                if (Array.isArray(ticketsData)) {
                    tickets = ticketsData;
                } else if (ticketsData && typeof ticketsData === 'object' && 'hydra:member' in ticketsData) {
                    const hydraMember = (ticketsData as { 'hydra:member': ApiTicket[] })['hydra:member'];
                    if (Array.isArray(hydraMember)) {
                        tickets = hydraMember;
                    }
                }

                // Извлекаем уникальные города из адресов тикетов
                const citiesMap = new Map<string, City>();

                tickets.forEach(ticket => {
                    ticket.addresses?.forEach(address => {
                        if (address.city?.title) {
                            const cityName = address.city.title.trim();
                            if (!citiesMap.has(cityName.toLowerCase())) {
                                citiesMap.set(cityName.toLowerCase(), {
                                    id: address.city.id,
                                    name: cityName
                                });
                            }
                        }
                    });
                });

                const uniqueCities = Array.from(citiesMap.values());
                uniqueCities.sort((a, b) => a.name.localeCompare(b.name));

                setCities(uniqueCities);
            }
        } catch (error) {
            console.error('Error extracting cities from tickets:', error);
        }
    }, []);

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

    // Функция для фильтрации по городу
    const filterByCity = useCallback(async (tickets: TypedTicket[], cityFilter: string): Promise<TypedTicket[]> => {
        if (!cityFilter || !cityFilter.trim()) {
            return tickets;
        }

        const filteredTickets = await Promise.all(
            tickets.map(async (ticket) => {
                const addressInfo = await getAddressInfo(ticket);
                const cityName = addressInfo.cityName?.toLowerCase() || '';
                const districtName = addressInfo.districtName?.toLowerCase() || '';
                const fullAddress = addressInfo.formatted.toLowerCase();
                const searchCity = cityFilter.toLowerCase();

                // Проверяем несколько вариантов совпадения
                const matchesCity =
                    cityName.includes(searchCity) ||
                    districtName.includes(searchCity) ||
                    fullAddress.includes(searchCity);

                return matchesCity ? ticket : null;
            })
        );

        return filteredTickets.filter((ticket): ticket is TypedTicket => ticket !== null);
    }, [getAddressInfo]);

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



    const getSearchTitle = useMemo(() => {
        if (userRole === 'client') {
            return t('search.searchServices');
        } else if (userRole === 'master') {
            return t('search.searchAnnouncements');
        } else {
            return t('search.searchServicesAndAnnouncements');
        }
    }, [userRole, t]);

    const getSearchPlaceholder = useMemo(() => {
        if (userRole === 'client') {
            return t('search.whatWantFind');
        } else if (userRole === 'master') {
            return t('search.whatService');
        } else {
            return t('search.whatAreYouLooking');
        }
    }, [userRole, t]);

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
        try {
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/categories?locale=${locale}`, {
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

                setCategories(formatted);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // Функция для получения профессий
    const fetchOccupations = useCallback(async () => {
        try {
            const token = getAuthToken();
            const languageParam = (localStorage.getItem('i18nextLng') || 'ru') === 'tj' ? 'tj' : ((localStorage.getItem('i18nextLng') || 'ru') === 'ru' ? 'ru' : 'eng');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/ld+json, application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/occupations?locale=${languageParam}`, {
                headers: headers,
            });

            if (response.ok) {
                const occupationsData = await response.json();

                let formatted: Occupation[] = [];
                if (Array.isArray(occupationsData)) {
                    formatted = occupationsData.map((occ: { 
                        id: number; 
                        title: string; 
                        categories: { id: number; title: string }[] 
                    }) => ({
                        id: occ.id,
                        title: occ.title,
                        categories: occ.categories
                    }));
                } else if (occupationsData && typeof occupationsData === 'object' && 'hydra:member' in occupationsData) {
                    const hydraMember = (occupationsData as { 
                        'hydra:member': { 
                            id: number; 
                            title: string; 
                            categories: { id: number; title: string }[] 
                        }[] 
                    })['hydra:member'];
                    if (Array.isArray(hydraMember)) {
                        formatted = hydraMember.map((occ) => ({
                            id: occ.id,
                            title: occ.title,
                            categories: occ.categories
                        }));
                    }
                }

                setOccupations(formatted);
            }
        } catch (error) {
            console.error('Error fetching occupations:', error);
        }
    }, []);

    // Функция для фильтрации по количеству отзывов
    const filterByReviewCount = useCallback((tickets: TypedTicket[], minReviews: number): TypedTicket[] => {
        return tickets.filter(ticket => {
            // Используем reviewsCount из самого тикета - это более надежно и эффективно
            const reviewCount = ticket.reviewsCount || 0;
            return reviewCount >= minReviews;
        });
    }, []);


    // Функция получения тикетов с API
    const fetchAllTickets = useCallback(async (query: string = '', filterParams: FilterState) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const params = new URLSearchParams();
            params.append('active', 'true');
            params.append('locale', localStorage.getItem('i18nextLng') || 'ru');

            if (userRole === 'client') {
                params.append('service', 'true');
            } else if (userRole === 'master') {
                params.append('service', 'false');
            }

            if (filterParams.category) {
                params.append('category', filterParams.category);
            }

            if (filterParams.subcategory) {
                params.append('subcategory', filterParams.subcategory);
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
                    userReviewCount: 0  // Для фильтрации используем отдельный API
                };
            });

            let filteredData = typedTickets;

            // Фильтрация по городу
            if (filterParams.city) {
                filteredData = await filterByCity(filteredData, filterParams.city);
                console.log(`After city filtering: ${filteredData.length} tickets`);
            }

            // Фильтрация по количеству отзывов
            if (filterParams.reviewCount) {
                const minReviews = parseInt(filterParams.reviewCount);
                filteredData = filterByReviewCount(filteredData, minReviews);
                console.log(`After review count filtering: ${filteredData.length} tickets`);
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

                    return {
                        id: ticket.id,
                        title: ticket.title || 'Без названия',
                        price: ticket.budget || 0,
                        unit: ticket.unit?.title || 'TJS',
                        description: ticket.description,
                        address: addressInfo.formatted,
                        city: addressInfo.cityName,
                        date: ticket.createdAt,
                        author: userName,
                        authorId,
                        timeAgo: ticket.createdAt, // Передаём сырую дату, чтобы AnnouncementCard мог сам вычислить timeAgo
                        category: ticket.category?.title || 'другое',
                        type: ticket.type,
                        isInSelectedCity: priority > 0,
                        userRating: ticket.userRating,
                        userReviewCount: ticket.reviewsCount || 0  // Для отображения используем reviewsCount из API
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
    }, [userRole, filterByCity, selectedCity, sortTicketsWithPriority, getUserName, getAddressInfo, getTicketPriority]);

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
            currentSearch.filters.sortBy !== previousSearch.filters.sortBy ||
            currentSearch.filters.city !== previousSearch.filters.city; // Добавляем проверку города
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
            !filters.city) { // Добавляем город в проверку
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
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            city: '' // Сбрасываем город
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
                subcategory: '',
                rating: '',
                reviewCount: '',
                sortBy: '',
                city: ''
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
        fetchCities(); // Загружаем города
        fetchOccupations(); // Загружаем профессии
    }, [fetchCategories, fetchCities, fetchOccupations]);

    // При смене языка переполучаем категории, города и результаты поиска
    useLanguageChange(() => {
        fetchCategories();
        fetchCities();
        fetchOccupations();
        // Переполучаем результаты поиска с локализованным контентом
        if (searchResults.length > 0) {
            // Сбрасываем предыдущий поиск чтобы форсировать обновление
            previousSearchRef.current = {
                query: '',
                filters: {
                    minPrice: '',
                    maxPrice: '',
                    category: '',
                    rating: '',
                    reviewCount: '',
                    sortBy: '',
                    city: '',
                    subcategory: ''
                },
                userRole: null
            };
            // Если есть результаты - обновляем их независимо от наличия поискового запроса
            handleSearch();
        }
    });

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
        filters.city, // Добавляем город в зависимости
        userRole,
        selectedCity,
        handleSearch
    ]);

    // Обработчик события сброса всех состояний при клике на лого
    useEffect(() => {
        const handleResetAllStates = () => {
            // Сбрасываем все состояния поиска
            setSearchQuery('');
            setShowResults(false);
            setSearchResults([]);
            setShowFilters(false);
            setFilters({
                minPrice: '',
                maxPrice: '',
                category: '',
                subcategory: '',
                rating: '',
                reviewCount: '',
                sortBy: '',
                city: ''
            });
            
            // Сбрасываем предыдущий поиск
            previousSearchRef.current = {
                query: '',
                filters: {
                    minPrice: '',
                    maxPrice: '',
                    category: '',
                    subcategory: '',
                    rating: '',
                    reviewCount: '',
                    sortBy: '',
                    city: ''
                },
                userRole: null
            };
        };

        window.addEventListener('resetAllStates', handleResetAllStates);
        return () => window.removeEventListener('resetAllStates', handleResetAllStates);
    }, []);

    // Мемоизированный рендер результатов
    const renderedResults = useMemo(() => {
        if (isLoading) {
            return <div className={styles.loading}><p>{t('app.loading')}</p></div>;
        }

        if (searchResults.length === 0) {
            return <div className={styles.noResults}><p>{t('messages.noResults')}</p></div>;
        }

        return searchResults.map((result) => {
            // Логирование для отладки
            console.log('Search result:', { 
                title: result.title, 
                userRating: result.userRating,
                userReviewCount: result.userReviewCount 
            });
            
            return (
                <AnnouncementCard
                    key={result.id}
                    title={result.title}
                    description={cleanText(result.description)}
                    price={result.price}
                    unit={result.unit}
                    address={result.address}
                    date={result.date}
                    author={result.author}
                    category={result.category}
                    timeAgo={result.timeAgo} // Передаём сырую дату, AnnouncementCard сам отформатирует
                    ticketType={result.type}
                    userRole={userRole}
                    userRating={result.userRating}
                    userReviewCount={result.userReviewCount}
                    onClick={() => handleCardClick(result.id, result.authorId)}
                />
            );
        });
    }, [isLoading, searchResults, userRole, handleCardClick, cleanText, t]);

    return (
        <div className={`${styles.container} ${showFilters ? styles.containerExpanded : ''}`}>
            <div className={styles.search_with_filters}>
                <FilterPanel
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    onFilterChange={handleFilterChange}
                    filters={filters}
                    onResetFilters={handleResetFilters}
                    categories={categories}
                    cities={cities} // Передаем города в FilterPanel
                    occupations={occupations} // Передаем профессии в FilterPanel
                />

                <div className={styles.search_content}>
                    <div className={styles.search}>
                        <h2 className={styles.title}>
                            {getSearchTitle}
                        </h2>

                        {(filters.minPrice || filters.maxPrice || filters.category || filters.rating || filters.reviewCount || filters.city) && (
                            <div className={styles.active_filters}>
                                <span>{t('search.activeFilters')}</span>
                                {filters.minPrice && <span className={styles.filter_tag}>От {filters.minPrice} TJS</span>}
                                {filters.maxPrice && <span className={styles.filter_tag}>До {filters.maxPrice} TJS</span>}
                                {filters.category && (
                                    <span className={styles.filter_tag}>
                                        {categories.find(cat => cat.id.toString() === filters.category)?.name}
                                    </span>
                                )}
                                {filters.rating && <span className={styles.filter_tag}>{filters.rating}+ звезд</span>}
                                {filters.reviewCount && <span className={styles.filter_tag}>{filters.reviewCount}+ отзывов</span>}
                                {filters.city && (
                                    <span className={styles.filter_tag}>
                                        {cities.find(city => city.name.toLowerCase() === filters.city)?.name || filters.city}
                                    </span>
                                )}
                                <button
                                    className={styles.clear_filters_btn}
                                    onClick={handleResetFilters}
                                >
                                    {t('search.clearFilters')}
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
                                {isLoading ? t('app.loading') : t('search.find')}
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
                            <p>{t('search.filters')}</p>
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