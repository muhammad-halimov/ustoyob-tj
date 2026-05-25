import styles from './Search.module.scss';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FilterPanel from "../filters/FilterPanel";
import type { FilterState } from '../../../../entities';
import { getAuthToken, getUserRole, getUserData } from "../../../../utils/auth";
import { universalApiRequest } from '../../../../utils/apiHelper';
import { useNavigate } from "react-router-dom";
import { ROUTES } from '../../../../app/routers/routes';
import {textHelper} from "../../../../utils/textHelper";
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from "../../../../hooks";
import { Card } from "../../../../shared/ui/Ticket/Card/Card";
import { ServiceTypeFilter } from "../../../../widgets/Sorting/TypeFilter";
import { SortingFilter } from "../../../../widgets/Sorting/CriteriaFilter";
import { createChatWithAuthor, getChatsMe } from '../../../../utils/chatUtils';
import { getProvinces, getCities, getOccupations, getCategories } from "../../../../utils/dataCache";
import { PageLoader } from '../../../../widgets/PageLoader';
import { SelectSearch } from '../../../../shared/ui/SelectSearch';
import { EmptyState } from '../../../../widgets/EmptyState';
import Status from '../../../../shared/ui/Modal/Status';
import Feedback from '../../../../shared/ui/Modal/Feedback';
import { Clear } from '../../../../shared/ui/Button/Clear/Clear';
import { ShowMore } from '../../../../shared/ui/Button/ShowMore/ShowMore';
import { getPageSize } from '../../../../utils/pageSize';
import { parsePagedResponse } from '../../../../utils/apiHelper';
import { useShowMore } from '../../../../hooks';
import type { Ticket as ApiTicket, Occupation, TicketView, Category, UserRole } from '../../../../entities';

/** Intermediate type: raw API ticket enriched with computed display fields for filtering/sorting */
type TicketWithMeta = ApiTicket & { type: UserRole; userRating: number; userReviewCount: number };
import type { Province, City } from '../../../../entities';
import { formatTicketImageUrl, formatProfileImageUrl } from '../../../../utils/imageHelper';
import { getSessionJSON } from '../../../../utils/storageHelper';

interface SearchProps {
    onSearchResults: (results: TicketView[]) => void;
    onFilterToggle: (isVisible: boolean) => void;
}


const SEARCH_SESSION_KEY = 'search-state';

export default function Search({ onSearchResults, onFilterToggle }: SearchProps) {
    const { t } = useTranslation(['components', 'common']);
    // Restore from session on mount (survives back-navigation)
    const initSessionRef = useRef(getSessionJSON(SEARCH_SESSION_KEY));
    const [showFilters, setShowFilters] = useState<boolean>(() => (initSessionRef.current?.showFilters as boolean) ?? false);
    const [searchQuery, setSearchQuery] = useState<string>(() => (initSessionRef.current?.searchQuery as string) ?? '');
    const [selectedCity, setSelectedCity] = useState<string>(() => {
        return localStorage.getItem('selectedCity') || '';
    });
    const [searchResults, setSearchResults] = useState<TicketView[]>(() => (initSessionRef.current?.searchResults as TicketView[]) ?? []);
    const [showResults, setShowResults] = useState<boolean>(() => (initSessionRef.current?.showResults as boolean) ?? false);
    const showResultsRef = useRef<boolean>((initSessionRef.current?.showResults as boolean) ?? false);
    useEffect(() => { showResultsRef.current = showResults; }, [showResults]);

    const handleSearchQueryChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (!value.trim()) {
            setSearchResults([]);
            setShowResults(false);
            onSearchResults([]);
            previousSearchRef.current = {
                ...previousSearchRef.current,
                query: ''
            };
        }
    }, [onSearchResults]);
    const [filters, setFilters] = useState<FilterState>(() => {
        const saved = initSessionRef.current?.filters as FilterState | undefined;
        return saved ?? {
            minPrice: '',
            maxPrice: '',
            negotiablePrice: false,
            category: '',
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            province: '',
            city: ''
        };
    });
    const [isLoading, setIsLoading] = useState(false);
    const [filterResetCount, setFilterResetCount] = useState(0);
    const { page, setPage, appendRef: appendSearchRef, skipFetchRef: skipSearchFetchRef, setHasMore, showMoreProps: searchShowMoreProps } = useShowMore<TicketView>(setSearchResults);
    const [categories, setCategories] = useState<Category[]>([]);
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const [showOnlyServices, setShowOnlyServices] = useState<boolean>(() => (initSessionRef.current?.showOnlyServices as boolean) ?? false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState<boolean>(() => (initSessionRef.current?.showOnlyAnnouncements as boolean) ?? false);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>(() => ((initSessionRef.current?.sortBy as string) || 'newest') as 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc');
    const [secondarySortBy, setSecondarySortBy] = useState<'none' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>(() => ((initSessionRef.current?.secondarySortBy as string) || 'none') as 'none' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>(() => ((initSessionRef.current?.timeFilter as string) || 'all') as 'all' | 'today' | 'yesterday' | 'week' | 'month');
    const navigate = useNavigate();

    const previousSearchRef = useRef<{
        query: string;
        filters: FilterState;
        userRole: 'client' | 'master' | null;
        showOnlyServices: boolean;
        showOnlyAnnouncements: boolean;
        sortBy: string;
        secondarySortBy: string;
        timeFilter: string;
    }>({
        query: (initSessionRef.current?.searchQuery as string) ?? '',
        filters: (initSessionRef.current?.filters as FilterState) ?? {
            minPrice: '',
            maxPrice: '',
            negotiablePrice: false,
            category: '',
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            province: '',
            city: ''
        },
        userRole: null,
        showOnlyServices: (initSessionRef.current?.showOnlyServices as boolean) ?? false,
        showOnlyAnnouncements: (initSessionRef.current?.showOnlyAnnouncements as boolean) ?? false,
        sortBy: (initSessionRef.current?.sortBy as string) ?? 'newest',
        secondarySortBy: (initSessionRef.current?.secondarySortBy as string) ?? 'none',
        timeFilter: (initSessionRef.current?.timeFilter as string) ?? 'all',
    });

    // Функция для загрузки провинций из API
    const fetchProvinces = useCallback(async () => {
        try {
            const data = await getProvinces();
            const formatted: Province[] = data.map((p: { id: number; title: string }) => ({
                id: p.id,
                title: p.title,
            }));
            formatted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
            setProvinces(formatted);
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    }, []);

    // Функция для загрузки городов из API
    const fetchCities = useCallback(async () => {
        try {
            const citiesData = await getCities();
            const formatted: City[] = citiesData.map((city: { id: number; title: string }) => ({
                id: city.id,
                title: city.title
            }));

            // Убираем дубликаты и сортируем
            const uniqueCities = formatted.reduce((acc: City[], city: City) => {
                if (!acc.some(c => c.id === city.id)) {
                    acc.push(city);
                }
                return acc;
            }, []);
            
            uniqueCities.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
            setCities(uniqueCities);
        } catch (error) {
            console.error('Error fetching cities:', error);
            // Фоллбек - извлекаем города из тикетов
            await extractCitiesFromTickets();
        }
    }, []);

    // Функция для извлечения городов из существующих тикетов
    const extractCitiesFromTickets = useCallback(async () => {
        try {
            const ticketsData = await universalApiRequest('/api/tickets?active=true&itemsPerPage=100');
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
                            citiesMap.set(cityName.toLowerCase(), { id: address.city.id, title: cityName });
                        }
                    }
                });
            });
            const uniqueCities = Array.from(citiesMap.values());
            uniqueCities.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
            setCities(uniqueCities);
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
    const filterByCity = useCallback(async (tickets: TicketWithMeta[], cityFilter: string): Promise<TicketWithMeta[]> => {
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

        return filteredTickets.filter((ticket): ticket is TicketWithMeta => ticket !== null);
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

    // Функция сортировки с учетом приоритета города и множественной сортировки
    const sortTicketsWithPriority = useCallback(async (
        tickets: TicketWithMeta[], 
        primarySort: string,
        secondarySort: string = 'none'
    ): Promise<TicketWithMeta[]> => {
        // Получаем приоритет для каждого тикета
        const ticketsWithPriority = await Promise.all(
            tickets.map(async (ticket) => ({
                ticket,
                priority: await getTicketPriority(ticket)
            }))
        );

        // Функция для получения значения сортировки
        const getSortValue = (ticket: TicketWithMeta, sortType: string): number => {
            switch (sortType) {
                case 'newest':
                    return new Date(ticket.createdAt ?? '').getTime();
                case 'oldest':
                    return -new Date(ticket.createdAt ?? '').getTime();
                case 'price-asc':
                    return ticket.budget ?? 0;
                case 'price-desc':
                    return -(ticket.budget ?? 0);
                case 'reviews-asc':
                    return ticket.userReviewCount || 0;
                case 'reviews-desc':
                    return -(ticket.userReviewCount || 0);
                case 'rating-asc':
                    return ticket.userRating || 0;
                case 'rating-desc':
                    return -(ticket.userRating || 0);
                // Поддержка старых форматов для обратной совместимости
                case 'rating_desc':
                    return -(ticket.userRating || 0);
                case 'rating_asc':
                    return ticket.userRating || 0;
                case 'reviews_desc':
                    return -(ticket.userReviewCount || 0);
                case 'reviews_asc':
                    return ticket.userReviewCount || 0;
                case 'price_desc':
                    return -(ticket.budget ?? 0);
                case 'price_asc':
                    return ticket.budget ?? 0;
                case 'date_desc':
                    return new Date(ticket.createdAt ?? '').getTime();
                case 'date_asc':
                    return -new Date(ticket.createdAt ?? '').getTime();
                default:
                    return 0;
            }
        };

        // Сортируем по приоритету города, затем по выбранной сортировке
        return ticketsWithPriority
            .sort((a, b) => {
                // Сначала по приоритету города
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }

                // Основная сортировка
                const primaryDiff = getSortValue(b.ticket, primarySort) - getSortValue(a.ticket, primarySort);
                
                // Если значения равны и есть вторичная сортировка
                if (primaryDiff === 0 && secondarySort !== 'none') {
                    return getSortValue(b.ticket, secondarySort) - getSortValue(a.ticket, secondarySort);
                }
                
                return primaryDiff;
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
            return ticketType === 'client' ? 'Заказчик не указан' : 'Специалист не назначен';
        }

        if (ticketType === 'client' && ticket.author) {
            if (ticket.author.name && ticket.author.surname) {
                return `${ticket.author.surname} ${ticket.author.name}`.trim();
            } else if (ticket.author.name) {
                return ticket.author.name;
            } else if (ticket.author.surname) {
                return ticket.author.surname;
            }
        } else if (ticketType === 'master' && ticket.master) {
            if (ticket.master.name && ticket.master.surname) {
                return `${ticket.master.surname} ${ticket.master.name}`.trim();
            } else if (ticket.master.name) {
                return ticket.master.name;
            } else if (ticket.master.surname) {
                return ticket.master.surname;
            }
        }

        return ticketType === 'client' ? 'Заказчик' : 'Специалист';
    }, []);

    // Функция загрузки категорий
    const fetchCategories = useCallback(async () => {
        try {
            const categoriesData = await getCategories();
            const formatted: Category[] = categoriesData.map((cat) => ({ id: cat.id, title: cat.title }));
            setCategories(formatted);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // Функция для получения профессий
    const fetchOccupations = useCallback(async () => {
        try {
            const occupationsData = await getOccupations();
            const formatted: Occupation[] = occupationsData.map((occ: { 
                id: number; 
                title: string; 
                categories?: { id: number; title: string }[] 
            }) => ({
                id: occ.id,
                title: occ.title,
                categories: occ.categories || []
            }));

            setOccupations(formatted);
        } catch (error) {
            console.error('Error fetching occupations:', error);
        }
    }, []);

    // Функция для фильтрации по количеству отзывов
    // Функция получения тикетов с API
    const fetchAllTickets = useCallback(async (query: string = '', filterParams: FilterState, silent = false, pageOverride?: number) => {
        try {
            if (!silent) setIsLoading(true);

            const params = new URLSearchParams();
            params.append('active', 'true');

            // Фильтр типа сервиса управляется только через ServiceTypeFilter
            if (showOnlyServices) {
                params.append('service', 'true');
            } else if (showOnlyAnnouncements) {
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

            if (filterParams.reviewCount) {
                params.append('reviewsCount[gte]', filterParams.reviewCount);
            }

            if (filterParams.negotiablePrice) {
                params.append('negotiableBudget', 'true');
            }

            if (filterParams.province) {
                params.append('province', filterParams.province);
            }

            if (filterParams.city) {
                if (filterParams.city.startsWith('city_')) {
                    params.append('city', filterParams.city.replace('city_', ''));
                } else if (filterParams.city.startsWith('district_')) {
                    params.append('district', filterParams.city.replace('district_', ''));
                }
            }

            // Город из хедера учитывается через приоритет сортировки (sortTicketsWithPriority),
            // а не через серверный фильтр — все тикеты показываются, городские идут первыми.

            const pageSize = getPageSize();
            params.append('page', String(pageOverride ?? page));
            params.append('itemsPerPage', String(pageSize));

            const responseData = await universalApiRequest(`/api/tickets?${params.toString()}`);
            let ticketsData: ApiTicket[] = [];
            const { items: parsedTickets, hasMore: fetchedHasMore } = parsePagedResponse<ApiTicket>(responseData, pageOverride ?? page, pageSize);
            ticketsData = parsedTickets;
            setHasMore(fetchedHasMore);

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
            const typedTickets: TicketWithMeta[] = ticketsData.map(ticket => {
                const ticketType = ticket.service ? 'master' : 'client';
                let userRating: number;
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

            // Фильтрация по времени
            if (timeFilter && timeFilter !== 'all') {
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - 7);
                const startOfMonth = new Date(startOfToday);
                startOfMonth.setMonth(startOfMonth.getMonth() - 1);

                filteredData = filteredData.filter(ticket => {
                    const ticketDate = new Date(ticket.createdAt ?? '');
                    
                    switch (timeFilter) {
                        case 'today':
                            return ticketDate >= startOfToday;
                        case 'yesterday':
                            return ticketDate >= startOfYesterday && ticketDate < startOfToday;
                        case 'week':
                            return ticketDate >= startOfWeek;
                        case 'month':
                            return ticketDate >= startOfMonth;
                        default:
                            return true;
                    }
                });
                console.log(`After time filtering (${timeFilter}): ${filteredData.length} tickets`);
            }

            // Фильтрация по городу и количеству отзывов выполняется на сервере (параметры выше)

            // Сортировка с учетом приоритета города и множественной сортировки
            if (sortBy || selectedCity) {
                filteredData = await sortTicketsWithPriority(
                    filteredData, 
                    sortBy || 'newest',
                    secondarySortBy
                );
            }

            // Создаем финальные результаты
            const ticketsWithUsers: TicketView[] = await Promise.all(
                filteredData.map(async (ticket) => {
                    const userName = await getUserName(ticket, ticket.type);
                    const authorId = ticket.type === 'client' ? ticket.author?.id : ticket.master?.id;
                    const addressInfo = await getAddressInfo(ticket);
                    const priority = await getTicketPriority(ticket);

                    return {
                        id: ticket.id,
                        title: ticket.title || 'Без названия',
                        price: ticket.budget ?? 0,
                        unit: (typeof ticket.unit === 'object' ? ticket.unit?.title : ticket.unit) || 'TJS',
                        description: ticket.description ?? '',
                        address: addressInfo.formatted,
                        city: addressInfo.cityName,
                        date: ticket.createdAt ?? '',
                        author: userName,
                        authorId,
                        timeAgo: ticket.createdAt ?? '',
                        category: ticket.category?.title || 'другое',
                        subcategory: ticket.subcategory?.title,
                        type: ticket.type,
                        isInSelectedCity: priority > 0,
                        userRating: ticket.userRating,
                        userReviewCount: ticket.reviewsCount || 0,  // Для отображения используем reviewsCount из API
                        responsesCount: ticket.responsesCount,
                        viewsCount: ticket.viewsCount,
                        photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
                        authorImage: (() => {
                            const person = ticket.type === 'master' ? ticket.master : ticket.author;
                            const src = person?.image || person?.imageExternalUrl;
                            return src ? formatProfileImageUrl(src) : undefined;
                        })(),
                        negotiableBudget: ticket.negotiableBudget
                    };
                })
            );

            console.log('Final results to display:', ticketsWithUsers.length);
            return ticketsWithUsers;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setHasMore(false);
            return [];
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [userRole, filterByCity, selectedCity, sortTicketsWithPriority, getUserName, getAddressInfo, getTicketPriority, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter, page]);

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
            userRole,
            showOnlyServices,
            showOnlyAnnouncements,
            sortBy,
            secondarySortBy,
            timeFilter
        };
        const previousSearch = previousSearchRef.current;

        const hasQueryChanged = currentSearch.query !== previousSearch.query;
        const hasFiltersChanged =
            currentSearch.filters.minPrice !== previousSearch.filters.minPrice ||
            currentSearch.filters.maxPrice !== previousSearch.filters.maxPrice ||
            currentSearch.filters.negotiablePrice !== previousSearch.filters.negotiablePrice ||
            currentSearch.filters.category !== previousSearch.filters.category ||
            currentSearch.filters.subcategory !== previousSearch.filters.subcategory ||
            currentSearch.filters.rating !== previousSearch.filters.rating ||
            currentSearch.filters.reviewCount !== previousSearch.filters.reviewCount ||
            currentSearch.filters.sortBy !== previousSearch.filters.sortBy ||
            currentSearch.filters.province !== previousSearch.filters.province ||
            currentSearch.filters.city !== previousSearch.filters.city ||
            currentSearch.showOnlyServices !== previousSearch.showOnlyServices ||
            currentSearch.showOnlyAnnouncements !== previousSearch.showOnlyAnnouncements ||
            currentSearch.sortBy !== previousSearch.sortBy ||
            currentSearch.secondarySortBy !== previousSearch.secondarySortBy ||
            currentSearch.timeFilter !== previousSearch.timeFilter;
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
            !filters.city &&
            !showResultsRef.current) { // Если уже есть результаты — не сбрасываем при смене сортировки
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

            setIsLoading(true);
            setShowResults(true);

            const results = await fetchAllTickets(searchQuery, filters, true);
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
            setIsLoading(false);
        }
    }, [searchQuery, filters, userRole, fetchAllTickets, onSearchResults]);

    const handleApply = useCallback(async (newFilters: FilterState) => {
        setFilters(newFilters);
        skipSearchFetchRef.current = true;
        setPage(1);
        appendSearchRef.current = false;
        if (isSearchInProgressRef.current) return;
        isSearchInProgressRef.current = true;
        setShowResults(true); // показываем PageLoader сразу, до окончания запроса
        try {
            const results = await fetchAllTickets(searchQuery, newFilters, false, 1);
            setSearchResults(results);
            setShowResults(true);
            onSearchResults(results);
            previousSearchRef.current = {
                query: searchQuery.trim(),
                filters: newFilters,
                userRole,
                showOnlyServices,
                showOnlyAnnouncements,
                sortBy,
                secondarySortBy,
                timeFilter
            };
        } catch (error) {
            console.error('Apply error:', error);
        } finally {
            isSearchInProgressRef.current = false;
            skipSearchFetchRef.current = false;
        }
    }, [searchQuery, fetchAllTickets, onSearchResults, userRole, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    const handleForceRefresh = useCallback(async () => {
        if (isSearchInProgressRef.current) return;
        isSearchInProgressRef.current = true;
        const isAppending = appendSearchRef.current;
        try {
            const results = await fetchAllTickets(searchQuery, filters, isAppending);
            if (isAppending) {
                appendSearchRef.current = false;
                setSearchResults(prev => {
                    const merged = [...prev, ...results];
                    onSearchResults(merged);
                    return merged;
                });
            } else {
                setSearchResults(results);
                setShowResults(true);
                onSearchResults(results);
            }
            previousSearchRef.current = {
                query: searchQuery.trim(),
                filters,
                userRole,
                showOnlyServices,
                showOnlyAnnouncements,
                sortBy,
                secondarySortBy,
                timeFilter
            };
        } catch (error) {
            console.error('Force refresh error:', error);
        } finally {
            isSearchInProgressRef.current = false;
        }
    }, [searchQuery, filters, userRole, fetchAllTickets, onSearchResults, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    // Обработчики событий
    const handleCardClick = useCallback((ticketId?: number) => {
        if (!ticketId) return;
        navigate(ROUTES.TICKET_BY_ID(ticketId));
    }, [navigate]);

    // Состояния для отклика на карточку (без перехода)
    const [respondedTickets, setRespondedTickets] = useState<Set<number>>(new Set());
    const [respondingTicketId, setRespondingTicketId] = useState<number | null>(null);
    const [respondModal, setRespondModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });
    const [cardReviewTarget, setCardReviewTarget] = useState<{ authorId: number; ticketId: number } | null>(null);
    const [cardComplaintTarget, setCardComplaintTarget] = useState<{ authorId: number; ticketId: number } | null>(null);

    // Проверяем существующие чаты при монтировании (постоянное состояние отклика)
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        (async () => {
            try {
                const data = await getChatsMe();
                const chats: any[] = data;
                const ids = new Set<number>();
                chats.forEach((chat: any) => {
                    const t = chat.ticket;
                    const id = t?.id ?? (() => { const m = String(t?.['@id'] || '').match(/\/\d+$/); return m ? parseInt(m[0].slice(1)) : null; })();
                    if (id) ids.add(id);
                });
                if (ids.size > 0) setRespondedTickets(ids);
            } catch { /* ignore */ }
        })();
    }, []);

    const handleRespondCard = useCallback(async (ticketId: number, authorId: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }
        if (respondedTickets.has(ticketId) || respondingTicketId === ticketId) return;
        setRespondingTicketId(ticketId);
        try {
            const chat = await createChatWithAuthor(authorId, ticketId);
            if (chat) {
                setRespondedTickets(prev => new Set(prev).add(ticketId));
                setRespondModal({ open: true, type: 'success', message: t('messages.respondSuccess', 'Вы успешно откликнулись!') });
            } else {
                setRespondModal({ open: true, type: 'error', message: t('messages.respondError', 'Не удалось откликнуться. Попробуйте ещё раз.') });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('messages.respondError', 'Не удалось откликнуться. Попробуйте ещё раз.');
            setRespondModal({ open: true, type: 'error', message: msg });
        } finally {
            setRespondingTicketId(null);
        }
    }, [respondedTickets, respondingTicketId, t]);

    const handleFilterToggle = useCallback((isVisible: boolean) => {
        setShowFilters(isVisible);
        onFilterToggle(isVisible);
    }, [onFilterToggle]);

    const handleResetFilters = useCallback(() => {
        setFilters({
            minPrice: '',
            maxPrice: '',
            negotiablePrice: false,
            category: '',
            subcategory: '',
            rating: '',
            reviewCount: '',
            sortBy: '',
            province: '',
            city: ''
        });
        setShowOnlyServices(false);
        setShowOnlyAnnouncements(false);
        setSortBy('newest');
        setSecondarySortBy('none');
        setTimeFilter('all');
        setShowResults(false);
        setSearchResults([]);
        setPage(1);
        setFilterResetCount(c => c + 1);
        onSearchResults([]);
        previousSearchRef.current = {
            query: searchQuery,
            filters: {
                minPrice: '',
                maxPrice: '',
                negotiablePrice: false,
                category: '',
                subcategory: '',
                rating: '',
                reviewCount: '',
                sortBy: '',
                province: '',
                city: ''
            },
            userRole,
            showOnlyServices: false,
            showOnlyAnnouncements: false,
            sortBy: 'newest',
            secondarySortBy: 'none',
            timeFilter: 'all'
        };
    }, [searchQuery, userRole, onSearchResults, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);


    // При смене страницы перезагружаем результаты
    useEffect(() => {
        if (skipSearchFetchRef.current) {
            skipSearchFetchRef.current = false;
            return;
        }
        if (showResults) {
            handleForceRefresh();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);



    // Сбрасываем страницу при изменении поисковых параметров
    useEffect(() => {
        appendSearchRef.current = false;
        setPage(1);
    }, [searchQuery, filters.minPrice, filters.maxPrice, filters.category, filters.rating, filters.city, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    // Эффекты
    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);
        fetchCategories();
        fetchProvinces(); // Загружаем провинции
        fetchCities(); // Загружаем города
        fetchOccupations(); // Загружаем профессии
    }, [fetchCategories, fetchProvinces, fetchCities, fetchOccupations]);

    // При смене языка переполучаем категории, провинции, города и результаты поиска
    useLanguageChange(() => {
        fetchCategories();
        fetchProvinces();
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
                    negotiablePrice: false,
                    category: '',
                    rating: '',
                    reviewCount: '',
                    sortBy: '',
                    province: '',
                    city: '',
                    subcategory: ''
                },
                userRole: null,
                showOnlyServices: false,
                showOnlyAnnouncements: false,
                sortBy: 'newest',
                secondarySortBy: 'none',
                timeFilter: 'all'
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
        filters.city,
        filters.subcategory,
        userRole,
        selectedCity,
        showOnlyServices,
        showOnlyAnnouncements,
        sortBy,
        secondarySortBy,
        timeFilter,
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
                negotiablePrice: false,
                category: '',
                subcategory: '',
                rating: '',
                reviewCount: '',
                sortBy: '',
                province: '',
                city: ''
            });
            setShowOnlyServices(false);
            setShowOnlyAnnouncements(false);
            setSortBy('newest');
            setSecondarySortBy('none');
            setTimeFilter('all');
            
            // Сбрасываем предыдущий поиск
            previousSearchRef.current = {
                query: '',
                filters: {
                    minPrice: '',
                    maxPrice: '',
                    negotiablePrice: false,
                    category: '',
                    subcategory: '',
                    rating: '',
                    reviewCount: '',
                    sortBy: '',
                    province: '',
                    city: ''
                },
                userRole: null,
                showOnlyServices: false,
                showOnlyAnnouncements: false,
                sortBy: 'newest',
                secondarySortBy: 'none',
                timeFilter: 'all'
            };
            sessionStorage.removeItem(SEARCH_SESSION_KEY);
        };

        window.addEventListener('resetAllStates', handleResetAllStates);
        return () => window.removeEventListener('resetAllStates', handleResetAllStates);
    }, []);

    // Сохраняем состояние поиска в sessionStorage при каждом изменении
    useEffect(() => {
        try {
            sessionStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify({
                searchQuery,
                searchResults,
                showResults,
                showFilters,
                filters,
                showOnlyServices,
                showOnlyAnnouncements,
                sortBy,
                secondarySortBy,
                timeFilter,
            }));
        } catch { /* ignore quota errors */ }
    }, [searchQuery, searchResults, showResults, showFilters, filters, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    // Мемоизированный рендер результатов
    const renderedResults = useMemo(() => {
        const currentUserId = getUserData()?.id;

        if (showFilters && !showResults && !isLoading) {
            return <div className={styles.emptyStateWrap}><EmptyState /></div>;
        }

        if (isLoading && searchResults.length === 0) {
            return <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingTop: '2rem' }}><PageLoader fullPage={false} /></div>;
        }

        if (!isLoading && searchResults.length === 0) {
            return <EmptyState title={t('messages.noResults')} onRefresh={handleForceRefresh} />;
        }

        return searchResults.map((result) => {
            // Логирование для отладки
            console.log('Search result:', { 
                title: result.title, 
                userRating: result.userRating,
                userReviewCount: result.userReviewCount 
            });
            
            return (
                <Card
                    key={result.id}
                    ticketId={result.id}
                    title={result.title}
                    description={textHelper(result.description)}
                    price={result.price}
                    unit={result.unit}
                    address={result.address}
                    date={result.date}
                    author={result.author}
                    authorId={result.authorId}
                    category={result.category}
                    subcategory={result.subcategory}
                    timeAgo={result.timeAgo} // Передаём сырую дату, Card сам отформатирует
                    ticketType={result.type}
                    userRole={userRole}
                    userRating={result.userRating}
                    userReviewCount={result.userReviewCount}
                    responsesCount={result.responsesCount}
                    viewsCount={result.viewsCount}
                    photos={result.photos}
                    authorImage={result.authorImage}
                    negotiableBudget={result.negotiableBudget}
                    onClick={() => handleCardClick(result.id)}
                    onRespondClick={result.authorId !== currentUserId ? () => handleRespondCard(result.id, result.authorId!) : undefined}
                    isResponded={respondedTickets.has(result.id)}
                    isRespondLoading={respondingTicketId === result.id}
                    onReviewClick={result.authorId !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardReviewTarget({ authorId: result.authorId!, ticketId: result.id }); } : undefined}
                    onComplaintClick={result.authorId !== currentUserId ? () => { setCardComplaintTarget({ authorId: result.authorId!, ticketId: result.id }); } : undefined}
                />
            );
        });
    }, [isLoading, showResults, searchResults, userRole, handleCardClick, textHelper, t, handleForceRefresh, handleRespondCard, respondedTickets, respondingTicketId]);

    return (
        <div className={`${styles.container} ${showFilters ? styles.containerExpanded : ''}`}>
            <div className={styles.search_with_filters}>
                <FilterPanel
                    key={filterResetCount}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    onApply={handleApply}
                    filters={filters}
                    onResetFilters={handleResetFilters}
                    categories={categories}
                    provinces={provinces} // Передаем провинции в FilterPanel
                    cities={cities} // Передаем города в FilterPanel
                    occupations={occupations} // Передаем профессии в FilterPanel
                />

                <div className={styles.search_content}>
                    <div className={styles.search}>
                        <h2 className={styles.title}>
                            {getSearchTitle}
                        </h2>

                        {(filters.minPrice || filters.maxPrice || filters.negotiablePrice || filters.province || filters.category || filters.rating || filters.reviewCount || filters.city) && (
                            <div className={styles.active_filters}>
                                <span>{t('search.activeFilters')}</span>
                                {filters.minPrice && <span className={styles.filter_tag}>От {filters.minPrice} TJS</span>}
                                {filters.maxPrice && <span className={styles.filter_tag}>До {filters.maxPrice} TJS</span>}
                                {filters.negotiablePrice && <span className={styles.filter_tag}>Договорная</span>}
                                {filters.province && (
                                    <span className={styles.filter_tag}>
                                        {provinces.find(p => p.id.toString() === filters.province)?.title || filters.province}
                                    </span>
                                )}
                                {filters.city && (
                                    <span className={styles.filter_tag}>
                                        {filters.city}
                                    </span>
                                )}
                                {filters.category && (
                                    <span className={styles.filter_tag}>
                                        {categories.find(cat => cat.id.toString() === filters.category)?.title}
                                    </span>
                                )}
                                {filters.rating && <span className={styles.filter_tag}>{filters.rating}+ звезд</span>}
                                {filters.reviewCount && <span className={styles.filter_tag}>{filters.reviewCount}+ отзывов</span>}
                                <button
                                    className={styles.clear_filters_btn}
                                    onClick={handleResetFilters}
                                >
                                    {t('search.clearFilters')}
                                </button>
                            </div>
                        )}

                        <div className={styles.search_wrap}>
                            <SelectSearch
                                altMode
                                options={[]}
                                value={searchQuery}
                                onChange={handleSearchQueryChange}
                                placeholder={getSearchPlaceholder}
                                className={styles.input_wrap}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            {false}
                        </div>

                        <div className={styles.filter_controls}>
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
                        {showFilters && (
                            <Clear
                                className={styles.clear_filters_control_btn}
                                onClick={() => { handleResetFilters(); handleFilterToggle(false); }}
                            />
                        )}
                        </div>
                    </div>

                    {showResults && (
                        <>
                            {/* Фильтр типа сервиса */}
                            <ServiceTypeFilter
                                showOnlyServices={showOnlyServices}
                                showOnlyAnnouncements={showOnlyAnnouncements}
                                onServiceToggle={() => {
                                    setShowOnlyServices(!showOnlyServices);
                                    if (!showOnlyServices) setShowOnlyAnnouncements(false);
                                }}
                                onAnnouncementsToggle={() => {
                                    setShowOnlyAnnouncements(!showOnlyAnnouncements);
                                    if (!showOnlyAnnouncements) setShowOnlyServices(false);
                                }}
                            />

                            {/* Сортировка и фильтрация по времени */}
                            <SortingFilter
                                sortBy={sortBy}
                                secondarySortBy={secondarySortBy}
                                timeFilter={timeFilter}
                                onSortChange={setSortBy}
                                onSecondarySortChange={setSecondarySortBy}
                                onTimeFilterChange={setTimeFilter}
                            />
                        </>
                    )}

                    <div className={`${styles.searchResults} ${!showResults && !showFilters ? styles.hidden : ''}`}>
                        {renderedResults}
                        {showResults && (
                            <ShowMore
                                {...searchShowMoreProps}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                                loading={isLoading}
                                horizontal
                            />
                        )}
                    </div>
                </div>
            </div>
            <Status
                type={respondModal.type}
                isOpen={respondModal.open}
                onClose={() => setRespondModal(prev => ({ ...prev, open: false }))}
                message={respondModal.message}
            />
            {cardReviewTarget && (
                <Feedback
                    mode="review"
                    isOpen={!!cardReviewTarget}
                    onClose={() => setCardReviewTarget(null)}
                    onSuccess={() => setCardReviewTarget(null)}
                    onError={() => {}}
                    ticketId={cardReviewTarget.ticketId}
                    targetUserId={cardReviewTarget.authorId}
                    showServiceSelector={false}
                />
            )}
            {cardComplaintTarget && (
                <Feedback
                    mode="complaint"
                    isOpen={!!cardComplaintTarget}
                    onClose={() => setCardComplaintTarget(null)}
                    onSuccess={() => setCardComplaintTarget(null)}
                    onError={() => {}}
                    targetUserId={cardComplaintTarget.authorId}
                    ticketId={cardComplaintTarget.ticketId}
                    complaintType="ticket"
                />
            )}
        </div>
    );
}