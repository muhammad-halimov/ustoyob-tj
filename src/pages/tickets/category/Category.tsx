import {useState, useEffect, useCallback} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole, getUserData } from '../../../utils/auth.ts';
import { getStorageItem } from '../../../utils/storageHelper.ts';
import { useLanguageChange } from '../../../hooks/useLanguageChange.ts';
import styles from './Category.module.scss';
import { TicketCard } from '../../../shared/ui/TicketCard/TicketCard.tsx';
import { ServiceTypeFilter } from '../../../widgets/Sorting/ServiceTypeFilter';
import { SortingFilter } from '../../../widgets/Sorting/SortingFilter';
import { useTranslation } from 'react-i18next';
import CookieConsentBanner from "../../../widgets/CookieConsentBanner/CookieConsentBanner.tsx";
import { getOccupations } from '../../../utils/dataCache.ts';
import { truncateText } from '../../../shared/ui/TicketCard/TicketCard.tsx';

interface Occupation {
    id: number;
    title: string;
    image?: string;
    categories: { id: number; title: string }[];
}

interface Ticket {
    id: number;
    title: string;
    description: string;
    notice: string;
    budget: number;
    active: boolean;
    service: boolean; // true - услуга от мастера, false - заказ от клиента
    category: {
        id: number;
        title: string;
        image: string;
    };
    subcategory?: {
        id: number;
        title: string;
        image: string;
    } | null;
    author: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
        rating?: number;
    } | null;
    master: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
        rating?: number;
    } | null;
    images: Array<{
        id: number;
        image: string;
    }>;
    unit: {
        id: number;
        title: string;
    };
    district?: {
        id: number;
        title: string;
        image: string;
        city?: {
            id: number;
            title: string;
            image: string;
            province?: {
                id: number;
                title: string;
            };
        };
    };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        district?: { id: number; title: string; image: string };
        city?: { id: number; title: string; image: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
        suburb?: { id: number; title: string };
        title?: string; // Улица/дом/квартира
    }>;
    createdAt: string;
    updatedAt: string;
}

interface FormattedTicket {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    fullAddress: string; // Добавляем поле для полного адреса
    date: string;
    author: string;
    timeAgo: string;
    category: string;
    subcategory?: string;
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
    userRating?: number;
    userReviewCount?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Category() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryName, setCategoryName] = useState<string>('');
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
    const [showAllOccupations, setShowAllOccupations] = useState(false);
    const [subcategorySearchQuery, setSubcategorySearchQuery] = useState<string>('');
    const [showOnlyServices, setShowOnlyServices] = useState(false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState(false);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>('newest');
    const [secondarySortBy, setSecondarySortBy] = useState<'none' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>('none');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
    const { t, i18n } = useTranslation(['components', 'category']);
    const locale = i18n.language;
    
    useLanguageChange(() => {
        // При смене языка переполучаем данные для обновления локализованного контента
        if (id) {
            fetchCategoryName();
            fetchOccupations();
            // fetchTicketsByCategory вызовется автоматически через useEffect при изменении языка
        }
    });

    useEffect(() => {
        const role = getUserRole();
        const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        console.log('🔥 Category - Initial mount');
        console.log('🔥 localStorage["userRole"]:', rawRole);
        console.log('🔥 getUserRole() returned:', role);
        setUserRole(role);

        if (id) {
            // НЕ вызываем fetchTicketsByCategory здесь, он вызовется из useEffect с зависимостью userRole
            fetchCategoryName();
            fetchOccupations();
        }
    }, [id]);

    // Отслеживаем изменения роли и перезагружаем данные
    useEffect(() => {
        const interval = setInterval(() => {
            const currentRole = getUserRole();
            const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
            if (currentRole !== userRole) {
                console.log('🔥 Category - Role changed from', userRole, 'to', currentRole);
                console.log('🔥 localStorage["userRole"]:', rawRole);
                setUserRole(currentRole);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [userRole]);

    // Перезагружаем данные при изменении роли или языка
    useEffect(() => {
        if (id) {
            const token = getAuthToken();
            
            // Загружаем данные если:
            // 1) userRole !== null (пользователь авторизован и роль загружена)
            // 2) !token (пользователь НЕ авторизован, userRole будет null - это нормально)
            // НЕ загружаем если: token && userRole === null (авторизован, но роль еще не загрузилась из localStorage)
            const shouldFetch = userRole !== null || !token;
            
            console.log('Category - Check if should fetch:', {
                id,
                userRole,
                hasToken: !!token,
                shouldFetch,
                locale
            });
            
            if (shouldFetch) {
                console.log('Category - Triggering data reload for role:', userRole, 'locale:', locale);
                fetchTicketsByCategory();
            } else {
                console.log('⏳ Category - Waiting for userRole to load from localStorage...');
            }
        }
    }, [userRole, id, locale, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

        if (imagePath.startsWith('/images/profile_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        }
    };

    const formatOccupationImageUrl = (imagePath?: string): string => {
        if (!imagePath) return '/default_subcategory.png'; // Дефолтное изображение

        // Проверяем, начинается ли путь с /images/
        if (imagePath.startsWith('/images/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        // Если путь уже содержит http или просто имя файла
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // По умолчанию используем путь из API для изображений профессий
        return `${API_BASE_URL}/images/occupation_photos/${imagePath}`;
    };

    const fetchCategoryName = async () => {
        try {
            const token = getAuthToken();
            const locale = getStorageItem('i18nextLng') || 'ru';
            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}/api/categories/${id}?locale=${locale}`, {
                headers: headers
            });

            if (response.ok) {
                const categoryData = await response.json();
                setCategoryName(categoryData.title);
            } else {
                setCategoryName('Категория');
            }
        } catch (error) {
            console.error('Error fetching category name:', error);
            setCategoryName('Категория');
        }
    };

    const fetchOccupations = async () => {
        try {
            const occupationsData = await getOccupations();
            
            const formatted: Occupation[] = occupationsData.filter((occ: { 
                id: number; 
                title: string;
                image?: string;
                categories?: { id: number; title: string }[] 
            }) => 
                occ.categories?.some(cat => cat.id.toString() === id) || false
            ).map((occ) => ({
                id: occ.id,
                title: occ.title,
                image: occ.image,
                categories: occ.categories || []
            }));

            setOccupations(formatted);
        } catch (error) {
            console.error('Error fetching occupations:', error);
        }
    };

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

    // Функция для получения полного адреса
    const getFullAddress = useCallback((ticket: Ticket): string => {
        // Проверяем addresses массив (новый формат)
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts: string[] = [];

            // Добавляем все компоненты адреса в правильном порядке
            if (address.province?.title) {
                parts.push(address.province.title);
            }
            if (address.city?.title) {
                parts.push(address.city.title);
            }
            if (address.district?.title) {
                parts.push(address.district.title);
            }
            if (address.settlement?.title) {
                parts.push(address.settlement.title);
            }
            if (address.community?.title) {
                parts.push(address.community.title);
            }
            if (address.village?.title) {
                parts.push(address.village.title);
            }
            if (address.suburb?.title) {
                parts.push(address.suburb.title);
            }
            // Конкретный адрес (улица, дом, квартира)
            if (address.title) {
                parts.push(address.title);
            }

            // Удаляем дубликаты и пустые значения
            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        return 'Адрес не указан';
    }, []);

    // Функция для получения краткого адреса (город, район)
    const getShortAddress = useCallback((ticket: Ticket): string => {
        // Проверяем addresses массив
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts: string[] = [];

            // Только город и район
            if (address.city?.title) {
                parts.push(address.city.title);
            }
            if (address.district?.title) {
                parts.push(address.district.title);
            }

            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        // Проверяем устаревший формат
        if (ticket.district) {
            const parts: string[] = [];

            if (ticket.district.city?.title) {
                parts.push(ticket.district.city.title);
            }
            if (ticket.district?.title) {
                parts.push(ticket.district.title);
            }

            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        return 'Адрес не указан';
    }, []);

    const fetchTicketsByCategory = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            const userData = getUserData();
            const currentUserId = userData?.id;
            const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

            console.log('============================================');
            console.log('🚀 Category - Fetching tickets for category:', id);
            console.log('🚀 Category - Selected subcategory:', selectedSubcategory);
            console.log('🚀 Category - locale:', locale);
            console.log('🚀 localStorage["userRole"]:', rawRole);
            console.log('🚀 Category - userRole STATE:', userRole);
            console.log('🚀 Category - getUserRole():', getUserRole());
            console.log('🚀 Category - Current user ID:', currentUserId);
            console.log('🚀 Category - Token exists:', !!token);
            console.log('============================================');

            if (!id) {
                console.error('Category - No category ID provided');
                setTickets([]);
                return;
            }

            // Если есть токен но роль еще не загрузилась - ждем
            if (token && userRole === null) {
                console.log('⏳ Category - Waiting for userRole to load...');
                setIsLoading(false);
                return;
            }

            console.log('🔍 TERNARY CHECK - userRole === "client":', userRole === 'client');
            console.log('🔍 TERNARY CHECK - userRole === "master":', userRole === 'master');
            console.log('🔍 TERNARY CHECK - userRole value:', userRole, 'type:', typeof userRole);
            console.log('🔍 TERNARY CHECK - showOnlyServices:', showOnlyServices);
            console.log('🔍 TERNARY CHECK - showOnlyAnnouncements:', showOnlyAnnouncements);

            // Формируем базовый endpoint с учетом фильтров "Только услуги" и "Только объявления"
            let endpoint = '';
            
            if (userRole === 'client') {
                endpoint = `/api/tickets?locale=${locale}&active=true&service=true&exists[author]=false&exists[master]=true&category=${id}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}${currentUserId ? `&master.id[ne]=${currentUserId}` : ''}`;
            } else if (userRole === 'master') {
                endpoint = `/api/tickets?locale=${locale}&active=true&service=false&exists[author]=true&exists[master]=false&category=${id}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}${currentUserId ? `&author.id[ne]=${currentUserId}` : ''}`;
            } else {
                // Для неавторизованных: применяем фильтры
                if (showOnlyServices) {
                    // Только услуги от мастеров (service=true)
                    endpoint = `/api/tickets?locale=${locale}&active=true&service=true&category=${id}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}`;
                } else if (showOnlyAnnouncements) {
                    // Только объявления от клиентов (service=false)
                    endpoint = `/api/tickets?locale=${locale}&active=true&service=false&category=${id}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}`;
                } else {
                    // Все объявления
                    endpoint = `/api/tickets?locale=${locale}&active=true&category=${id}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}`;
                }
            }

            console.log('✅ Category - Selected endpoint:', `${API_BASE_URL}${endpoint}`);

            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            let ticketsData: Ticket[] = [];
            if (response.ok) {
                const data = await response.json();
                ticketsData = Array.isArray(data) ? data : [];
            } else {
                console.error('Category - Error fetching tickets:', response.status, response.statusText);
            }

            console.log('Category - Total tickets received:', ticketsData.length);

            // Форматируем тикеты
            const formattedTickets: FormattedTicket[] = ticketsData.map(ticket => {
                const isMasterTicket = ticket.service; // service: true - услуга от мастера
                const author = isMasterTicket ? ticket.master : ticket.author;
                const authorId = author?.id || 0;
                const authorName = author ? `${author.name || ''} ${author.surname || ''}`.trim() : 'Пользователь';

                const fullAddress = getFullAddress(ticket);
                const shortAddress = getShortAddress(ticket);

                return {
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'TJS',
                    description: ticket.description || 'Описание отсутствует',
                    address: shortAddress, // Краткий адрес для основного отображения
                    fullAddress: fullAddress, // Полный адрес
                    date: ticket.createdAt,
                    author: authorName,
                    authorId: authorId,
                    timeAgo: ticket.createdAt,
                    category: ticket.category?.title || 'другое',
                    subcategory: ticket.subcategory?.title,
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: isMasterTicket ? 'master' : 'client',
                    authorImage: author?.image ? formatProfileImageUrl(author.image) : undefined,
                    userRating: author?.rating || 0,
                    userReviewCount: 0 // Пока устанавливаем 0, позже добавим реальное получение
                };
            });

            // Применяем фильтр по времени
            let filteredTickets = formattedTickets;
            if (timeFilter !== 'all') {
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - 7);
                const startOfMonth = new Date(startOfToday);
                startOfMonth.setMonth(startOfMonth.getMonth() - 1);

                filteredTickets = formattedTickets.filter(ticket => {
                    const ticketDate = new Date(ticket.date);
                    
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
            }

            // Применяем сортировку
            const sortedTickets = [...filteredTickets].sort((a, b) => {
                // Вспомогательная функция для получения значения сортировки
                const getSortValue = (ticket: FormattedTicket, sortType: typeof sortBy | typeof secondarySortBy): number => {
                    switch (sortType) {
                        case 'newest':
                            return new Date(ticket.date).getTime();
                        case 'oldest':
                            return -new Date(ticket.date).getTime();
                        case 'price-asc':
                            return ticket.price;
                        case 'price-desc':
                            return -ticket.price;
                        case 'reviews-asc':
                            return ticket.userReviewCount || 0;
                        case 'reviews-desc':
                            return -(ticket.userReviewCount || 0);
                        case 'rating-asc':
                            return ticket.userRating || 0;
                        case 'rating-desc':
                            return -(ticket.userRating || 0);
                        default:
                            return 0;
                    }
                };

                // Основная сортировка
                const primaryDiff = getSortValue(b, sortBy) - getSortValue(a, sortBy);
                
                // Если значения равны и есть вторичная сортировка, применяем её
                if (primaryDiff === 0 && secondarySortBy !== 'none') {
                    return getSortValue(b, secondarySortBy) - getSortValue(a, secondarySortBy);
                }
                
                return primaryDiff;
            });

            setTickets(sortedTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчики подкатегорий
    const handleSubcategoryClick = (subcategoryId: number | null) => {
        setSelectedSubcategory(subcategoryId);
    };

    const handleViewAllOccupations = () => {
        setShowAllOccupations(true);
    };

    const handleShowLessOccupations = () => {
        setShowAllOccupations(false);
    };

    const handleSubcategorySearch = (query: string) => {
        setSubcategorySearchQuery(query);
        // При поиске сбрасываем "показать все", чтобы показать все результаты поиска
        if (query.trim()) {
            setShowAllOccupations(false);
        }
    };

    const handleServiceToggle = () => {
        if (!showOnlyServices) {
            // Включаем "Только услуги" и выключаем "Только объявления"
            setShowOnlyServices(true);
            setShowOnlyAnnouncements(false);
        } else {
            // Выключаем "Только услуги"
            setShowOnlyServices(false);
        }
    };

    const handleAnnouncementsToggle = () => {
        if (!showOnlyAnnouncements) {
            // Включаем "Только объявления" и выключаем "Только услуги"
            setShowOnlyAnnouncements(true);
            setShowOnlyServices(false);
        } else {
            // Выключаем "Только объявления"
            setShowOnlyAnnouncements(false);
        }
    };

    // Определяем какие подкатегории показывать
    const getVisibleOccupations = () => {
        // Сначала фильтруем по поисковому запросу
        let filteredOccupations = occupations;
        
        if (subcategorySearchQuery.trim()) {
            const searchLower = subcategorySearchQuery.toLowerCase().trim();
            filteredOccupations = occupations.filter(occupation => 
                occupation.title.toLowerCase().includes(searchLower)
            );
        }
        
        // Потом с учетом состояния "showAllOccupations"
        if (showAllOccupations || subcategorySearchQuery.trim()) {
            return filteredOccupations;
        }
        
        // Показываем первые 8 подкатегорий
        return filteredOccupations.slice(0, Math.min(8, filteredOccupations.length));
    };

    const visibleOccupations = getVisibleOccupations();
    
    // Обновляем логику кнопок с учетом поиска
    const shouldShowViewAllOccupations = !showAllOccupations && !subcategorySearchQuery.trim() && occupations.length > 8;
    const shouldShowShowLessOccupations = showAllOccupations && occupations.length > 0;

    // Обновляем тикеты при изменении выбранной подкатегории
    useEffect(() => {
        if (id) {
            const token = getAuthToken();
            const shouldFetch = userRole !== null || !token;
            
            if (shouldFetch) {
                console.log('Category - Reloading due to subcategory change:', selectedSubcategory);
                fetchTicketsByCategory();
            } else {
                console.log('⏳ Category - Waiting for userRole before reloading subcategory...');
            }
        }
    }, [selectedSubcategory]);

    const handleCardClick = (ticketId: number) => {
        navigate(`/ticket/${ticketId}`);
    };

    const handleClose = () => {
        navigate(-1);
    };

    const getPageTitle = () => {
        if (!categoryName) return 'По категории';

        let roleText: string;

        if (userRole === 'client') {
            roleText = ' - Услуги мастеров';
        } else if (userRole === 'master') {
            roleText = ' - Заказы клиентов';
        } else {
            roleText = ' - Все объявления';
        }

        return `${truncateText(categoryName, 30)}${roleText}`;
    };

    // Если категория ID не передан
    if (!id) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Ошибка</h1>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div className={styles.noResults}>
                    <p>Категория не выбрана</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{getPageTitle()}</h1>
                <button className={styles.closeButton} onClick={handleClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {/* Сетка подкатегорий */}
            {occupations.length > 0 && (
                <div className={styles.subcategories}>
                    <div className={styles.subcategories_header}>
                        {/* Поле поиска подкатегорий */}
                        <div className={styles.subcategory_search}>
                            <div className={styles.search_input_wrapper}>
                                <svg className={styles.search_icon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <input
                                    type="text"
                                    className={styles.search_input}
                                    placeholder={t('category:searchSubcategories', 'Поиск по профессиям...')}
                                    value={subcategorySearchQuery}
                                    onChange={(e) => handleSubcategorySearch(e.target.value)}
                                />
                                {subcategorySearchQuery && (
                                    <button 
                                        className={styles.clear_search}
                                        onClick={() => handleSubcategorySearch('')}
                                        aria-label="Очистить поиск"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.subcategory_item}>
                        {/* Кнопка "Все" */}
                        {!subcategorySearchQuery.trim() && (
                            <div
                                className={`${styles.subcategory_item_step} ${selectedSubcategory === null ? styles.active : ''}`}
                                onClick={() => handleSubcategoryClick(null)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSubcategoryClick(null);
                                    }
                                }}
                            >
                                <img
                                    src="/default_all.png"
                                    alt={t('category:allSubcategories', 'Все')}
                                    onError={(e) => {
                                        // Fallback изображение для кнопки "Все"
                                        e.currentTarget.src = '/default_all.png';
                                    }}
                                    loading="lazy"
                                />
                                <p>{t('category:allSubcategories', 'Все')}</p>
                            </div>
                        )}

                        {/* Подкатегории */}
                        {visibleOccupations.map((occupation) => (
                            <div
                                key={occupation.id}
                                className={`${styles.subcategory_item_step} ${selectedSubcategory === occupation.id ? styles.active : ''}`}
                                onClick={() => handleSubcategoryClick(occupation.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSubcategoryClick(occupation.id);
                                    }
                                }}
                            >
                                <img
                                    src={formatOccupationImageUrl(occupation.image)}
                                    alt={occupation.title}
                                    onError={(e) => {
                                        // Fallback изображение для профессий с первой буквой
                                        const firstLetter = occupation.title.charAt(0).toUpperCase();
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${firstLetter}&background=e0e0e0&color=666&size=64&font-size=0.5`;
                                    }}
                                    loading="lazy"
                                />
                                <p>{occupation.title}</p>
                            </div>
                        ))}
                    </div>

                    {/* Кнопка "Посмотреть все" */}
                    {shouldShowViewAllOccupations && (
                        <div className={styles.subcategory_btn_center}>
                            <button
                                className={styles.viewAllButton}
                                onClick={handleViewAllOccupations}
                            >
                                {t('category:viewAll', 'Посмотреть все')}
                            </button>
                        </div>
                    )}

                    {/* Кнопка "Свернуть" */}
                    {shouldShowShowLessOccupations && (
                        <div className={styles.subcategory_btn_center}>
                            <button
                                className={styles.viewAllButton}
                                onClick={handleShowLessOccupations}
                            >
                                {t('category:showLess', 'Свернуть')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Переключатель "Только услуги" - показываем для неавторизованных и клиентов */}
            {(userRole === null || userRole === 'client') && (
                <div className={styles.service_filter_wrapper}>
                    <ServiceTypeFilter
                        showOnlyServices={showOnlyServices}
                        showOnlyAnnouncements={showOnlyAnnouncements}
                        onServiceToggle={handleServiceToggle}
                        onAnnouncementsToggle={handleAnnouncementsToggle}
                    />
                </div>
            )}

            {/* Блок сортировки и фильтрации */}
            <div className={styles.sorting_filter_wrapper}>
                <SortingFilter
                    sortBy={sortBy}
                    secondarySortBy={secondarySortBy}
                    timeFilter={timeFilter}
                    onSortChange={setSortBy}
                    onSecondarySortChange={setSecondarySortBy}
                    onTimeFilterChange={setTimeFilter}
                />
            </div>

            <div className={styles.searchResults}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка...</p></div>
                ) : tickets.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {categoryName
                                ? `Нет объявлений в категории "${categoryName}"`
                                : 'Нет объявлений в выбранной категории'
                            }
                        </p>
                        <button
                            className={styles.refreshButton}
                            onClick={() => fetchTicketsByCategory()}
                        >
                            Обновить
                        </button>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <TicketCard
                            key={ticket.id}
                            title={ticket.title}
                            description={cleanText(ticket.description)}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.fullAddress}
                            date={ticket.date}
                            author={ticket.author}
                            authorId={ticket.authorId}
                            category={ticket.category}
                            subcategory={ticket.subcategory}
                            timeAgo={ticket.timeAgo}
                            ticketType={ticket.type}
                            userRole={userRole}
                            userRating={ticket.userRating}
                            userReviewCount={ticket.userReviewCount}
                            onClick={() => handleCardClick(ticket.id)}
                        />
                    ))
                )}
            </div>
            <CookieConsentBanner/>
        </div>
    );
}

export default Category;