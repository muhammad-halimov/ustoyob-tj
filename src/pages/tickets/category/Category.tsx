import {useState, useEffect, useCallback} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../../utils/auth.ts';
import { useLanguageChange } from '../../../hooks/useLanguageChange.ts';
import styles from './Category.module.scss';
import { AnnouncementCard } from '../../../shared/ui/AnnouncementCard/AnnouncementCard.tsx';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation(['components', 'category']);
    
    useLanguageChange(() => {
        // При смене языка переполучаем данные для обновления локализованного контента
        if (id) {
            fetchCategoryName();
            fetchOccupations();
            fetchTicketsByCategory();
        }
    });

    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);

        if (id) {
            fetchTicketsByCategory();
            fetchCategoryName();
            fetchOccupations();
        }
    }, [id]);

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
            const headers: HeadersInit = {
                'Accept': 'application/json'
            };
            const token = getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/categories/${id}?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
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
            const headers: HeadersInit = {
                'Accept': 'application/json'
            };
            const token = getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const languageParam = (localStorage.getItem('i18nextLng') || 'ru') === 'tj' ? 'tj' : ((localStorage.getItem('i18nextLng') || 'ru') === 'ru' ? 'ru' : 'eng');
            const response = await fetch(`${API_BASE_URL}/api/occupations?locale=${languageParam}`, {
                headers: headers,
            });

            if (response.ok) {
                const occupationsData = await response.json();

                let formatted: Occupation[] = [];
                if (Array.isArray(occupationsData)) {
                    formatted = occupationsData.filter((occ: { 
                        id: number; 
                        title: string;
                        image?: string;
                        categories: { id: number; title: string }[] 
                    }) => 
                        occ.categories.some(cat => cat.id.toString() === id)
                    ).map((occ) => ({
                        id: occ.id,
                        title: occ.title,
                        image: occ.image,
                        categories: occ.categories
                    }));
                } else if (occupationsData && typeof occupationsData === 'object' && 'hydra:member' in occupationsData) {
                    const hydraMember = (occupationsData as { 
                        'hydra:member': { 
                            id: number; 
                            title: string;
                            image?: string;
                            categories: { id: number; title: string }[] 
                        }[] 
                    })['hydra:member'];
                    if (Array.isArray(hydraMember)) {
                        formatted = hydraMember.filter((occ) => 
                            occ.categories.some(cat => cat.id.toString() === id)
                        ).map((occ) => ({
                            id: occ.id,
                            title: occ.title,
                            image: occ.image,
                            categories: occ.categories
                        }));
                    }
                }

                setOccupations(formatted);
            }
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
            const role = getUserRole();

            console.log('Fetching tickets for category:', id);
            console.log('Selected subcategory:', selectedSubcategory);
            console.log('User role:', role);
            console.log('Token exists:', !!token);

            // Убеждаемся, что id есть
            if (!id) {
                console.error('No category ID provided');
                setTickets([]);
                return;
            }

            let ticketsData: Ticket[] = [];

            if (!token || role === null) {
                // Для неавторизованных - получаем все тикеты (и услуги и заказы)
                console.log('Fetching all tickets for unauthorized user');
                const [masterTickets, clientTickets] = await Promise.all([
                    fetchTicketsWithParams({
                        active: 'true',
                        service: 'true',
                        'exists[master]': 'true',
                        'category': id,
                        ...(selectedSubcategory && { 'subcategory': selectedSubcategory.toString() })
                    }),
                    fetchTicketsWithParams({
                        active: 'true',
                        service: 'false',
                        'exists[author]': 'true',
                        'category': id,
                        ...(selectedSubcategory && { 'subcategory': selectedSubcategory.toString() })
                    })
                ]);
                ticketsData = [...masterTickets, ...clientTickets];
            } else if (role === 'client') {
                // Для клиентов - получаем тикеты мастеров (услуги)
                console.log('Fetching master tickets for client');
                ticketsData = await fetchTicketsWithParams({
                    active: 'true',
                    service: 'true',
                    'exists[master]': 'true',
                    'category': id,
                    ...(selectedSubcategory && { 'subcategory': selectedSubcategory.toString() })
                }, token);
            } else if (role === 'master') {
                // Для мастеров - получаем тикеты клиентов (заказы)
                console.log('Fetching client tickets for master');
                ticketsData = await fetchTicketsWithParams({
                    active: 'true',
                    service: 'false',
                    'exists[author]': 'true',
                    'category': id,
                    ...(selectedSubcategory && { 'subcategory': selectedSubcategory.toString() })
                }, token);
            }

            console.log('Total tickets received:', ticketsData.length);

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
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: isMasterTicket ? 'master' : 'client',
                    authorImage: author?.image ? formatProfileImageUrl(author.image) : undefined,
                    userRating: author?.rating || 0,
                    userReviewCount: 0 // Пока устанавливаем 0, позже добавим реальное получение
                };
            });

            setTickets(formattedTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Универсальная функция для получения тикетов с query-параметрами
    const fetchTicketsWithParams = async (params: Record<string, string>, token?: string): Promise<Ticket[]> => {
        try {
            const headers: HeadersInit = {
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Создаем URL с query-параметрами
            const url = new URL(`${API_BASE_URL}/api/tickets?locale=${localStorage.getItem('i18nextLng') || 'ru'}`);

            // Добавляем параметры, убедившись, что они не undefined
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });

            console.log('Fetching from URL:', url.toString());

            const response = await fetch(url.toString(), {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Tickets fetched with params:`, data.length);
                return Array.isArray(data) ? data : [];
            } else {
                console.error(`Error fetching tickets: ${response.status} ${response.statusText}`);
                return [];
            }
        } catch (error) {
            console.error(`Error fetching tickets with params:`, error);
            return [];
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
            fetchTicketsByCategory();
        }
    }, [selectedSubcategory]);

    const handleCardClick = (ticketId: number, authorId: number) => {
        navigate(`/ticket/${authorId}?ticket=${ticketId}`);
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

        return `${categoryName}${roleText}`;
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
                        <AnnouncementCard
                            key={ticket.id}
                            title={ticket.title}
                            description={cleanText(ticket.description)}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.fullAddress}
                            date={ticket.date}
                            author={ticket.author}
                            category={ticket.category}
                            timeAgo={ticket.timeAgo}
                            ticketType={ticket.type}
                            userRole={userRole}
                            userRating={ticket.userRating}
                            userReviewCount={ticket.userReviewCount}
                            onClick={() => handleCardClick(ticket.id, ticket.authorId)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default Category;